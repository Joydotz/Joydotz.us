# Payment System — Full Plan

## Architecture Overview

```
Browser → Fastify API → Stripe (hosted checkout)
                ↓                    ↓
           Postgres DB    Stripe Events (payment confirmed)
                ↓                    ↓
           Kafka topic  ←  POST /api/stripe-events
                ↓
           KafkaWorker
                ↓
         Email handlers (order confirmation, refund notice)
```

---

## Database Schema

```
User
 └── Address[]   (onDelete: Restrict — cannot delete address with orders)
 └── Order[]
      └── OrderItem[]  (snapshot of name + price at purchase time)

OrderStatus: PENDING | PAID | SHIPPED | DELIVERED | FAILED | CANCELLED | REFUNDED
```

Key constraint: `Order.stripeSessionId` is `UNIQUE` — the database itself enforces idempotency for duplicate stripe event deliveries.

---

## Steps

**Infrastructure**

* [x] **Docker Compose** — add Kafka container for local development (KRaft mode, no Zookeeper needed)
* [x] **Prisma migration** — `Order`, `OrderItem`, `OrderStatus` (drop `EventQueue`)

**Event system**

* [x] **`EventBus` interface + `MockEventBus`**
* [x] **`KafkaEventBus`** — implements `EventBus` using `kafkajs`, publishes to `order-events` topic
* [x] **Kafka worker** — consumer on `order-events` topic, dispatches to handlers
* [x] **Event handlers** — `ORDER_PAID`, `ORDER_REFUNDED`

**Backend**

* [x] **`orderService.ts` + tests**
* [x] **`stripeService.ts` + tests**
* [x] **`POST /api/checkout/create-session` + tests**
* [x] **`POST /api/stripe-events` + tests**
* [x] **`GET /api/account/orders` + `GET /api/account/orders/:id` + tests**
* [x] **Wire into `app.ts`**

**Needs Stripe account**

* [x] **Test-mode keys + stripe event secret in env** — enables opt-in integration tests (`RUN_STRIPE_INTEGRATION=1`; see **Covered so far** below)
* [ ] **Production/live Stripe + dashboard stripe event endpoint** — deploy-time configuration and smoke checks
* [ ] **Stripe CLI** — local `stripe listen --forward-to …/api/stripe-events` (optional beyond automated tests)

**Frontend**

* [ ] **Cart context**
* [ ] **Checkout page**
* [ ] **Order confirmation page**

## What Is Done

### Backend

#### Prisma migration

- `Order`, `OrderItem`, `OrderStatus` models added to schema
- `stripeSessionId UNIQUE` constraint
- `Address → Order` with `onDelete: Restrict`

#### `orderService.ts`

- `createOrder` — nested write: order + all items in one transaction
- `getOrdersByUser` — newest-first, includes items + address
- `getOrderById` — scoped to userId (prevents accessing other users' orders)
- `getOrderByStripeSessionId` — used by stripe event; includes `user.email` for event publishing
- `updateOrderStripeSessionId` — after Stripe returns `cs_...`, replaces the temporary placeholder on the order so stripe event lookup by `session.id` works
- `updateOrderStatus` — transitions to any valid status
- `shipOrder` — sets SHIPPED + trackingNumber + shippedAt
- `markDelivered` — sets DELIVERED + deliveredAt

#### `stripeService.ts`

- `createCheckoutSession` — wraps `stripe.checkout.sessions.create`; mode: payment; embeds `orderId` + `userId` in metadata
- `constructStripe EventEvent` — wraps `stripe.stripe events.constructEvent`; passes raw Buffer for signature verification

#### `POST /api/checkout/create-session`

1. Authenticate user (JWT cookie)
2. Validate body: `addressId` (non-empty string) + `items` (array of `{ productId, quantity ≥ 1 }`)
3. Verify address belongs to the authenticated user
4. Resolve product data server-side from `products.ts` — client price fields are ignored
5. Calculate total server-side
6. Create `PENDING` order in DB (temporary `stripeSessionId` placeholder) to obtain an `orderId` before Stripe is called
7. Create Stripe Checkout Session with `orderId` + `userId` in metadata
8. Persist the real Checkout Session id (`cs_...`) on the order via `updateOrderStripeSessionId`
9. Return `{ url, orderId }` — client redirects to `url`

Body parsing note: the entire `checkoutRoutes` plugin overrides `application/json` to return raw Buffer. `create-session` manually `JSON.parse`s; the stripe events route uses the Buffer directly for signature verification.

#### `POST /api/stripe-events`

- No authentication; security is Stripe signature verification only
- `checkout.session.completed`:
  - Look up order by `session.id`
  - Idempotency guard: skip if already `PAID`
  - `updateOrderStatus(PAID)`
  - Publish `ORDER_PAID` to Kafka
- `charge.refunded`:
  - Look up order by `charge.metadata.orderId`
  - `updateOrderStatus(REFUNDED)`
  - Publish `ORDER_REFUNDED` to Kafka
- All other event types: silently return `{ received: true }`
- Always returns 200 on success so Stripe does not retry

#### `GET /api/account/orders` + `GET /api/account/orders/:id`

- Both routes protected by `authenticate` middleware
- `getOrdersByUser` — returns full order history for the authenticated user
- `getOrderById` — scoped to userId; returns 404 for missing or other users' orders

#### EventBus

- `EventBus` interface: `publish(type, payload)`
- `KafkaEventBus` — publishes JSON-serialised events to the `order-events` Kafka topic
- `MockEventBus` — in-memory store used in tests; `eventsOf(type)` for assertions
- Injected into `buildApp` via options; defaults to `MockEventBus` when none provided

#### KafkaWorker

- Subscribes to `order-events` topic
- Dispatches to typed handlers: `handleOrderPaid`, `handleOrderRefunded`
- Retry logic: up to 5 attempts with exponential backoff (1s → 2s → 4s → 8s → 16s)
- Dead-letters exhausted events to `console.error` for manual intervention

#### Event handlers

- `handleOrderPaid` — calls `saveEmail(email, 'order-confirmation')`; TODO: send full order details
- `handleOrderRefunded` — calls `saveEmail(email, 'order-refund')`; TODO: send refund details

#### Tests

- All services: unit tests with mocked Prisma; `stripeService` unit tests use a mocked Stripe SDK
- All routes: unit tests with mocked services + real JWT flow where applicable
- Example checkout route assertions: after a successful session create, `updateOrderStripeSessionId(orderId, cs_...)` is expected; line-item `stripePriceId` expectations follow `data/products.ts` (real `price_...` IDs in catalog)
- Integration tests (real Postgres): `orderService` — CRUD, FK violations, `onDelete: Restrict`, concurrent writes, duplicate `stripeSessionId`
- **Stripe service — real API:** [`server/tests/integration/server_stripe.test.ts`](server/tests/integration/server_stripe.test.ts) when env has real `sk_test_`, `whsec_`, plus at least one `price_...` in [`data/products.ts`](server/src/data/products.ts). Covers live `createCheckoutSession` (happy path, invalid price, empty line items), duplicate retry behavior for same order, new-intent behavior for different orders, and real `constructStripeEvent` (valid signature, wrong secret, stale timestamp, tampered body).
- **Checkout + stripe events + DB:** [`server/tests/integration/server_stripe_db.test.ts`](server/tests/integration/server_stripe_db.test.ts) — real Fastify (`buildApp`, `MockEventBus`, `skipCsrf` / `skipRateLimit`), test DB user/address, JWT cookie, `POST /api/checkout/create-session` → asserts order row has `cs_...` and is `PENDING` → signed `checkout.session.completed` to `POST /api/stripe-events` → order `PAID`; also covers `charge.refunded` and duplicate-delivery idempotency.
- **DB service integration:** [`server/tests/integration/server_db.test.ts`](server/tests/integration/server_db.test.ts) with real Postgres schema constraints and status transitions.
- Integration setup files under [`server/tests/integration`](server/tests/integration) configure env + DB bootstrap for each integration project.
- Commands:
  - `npm run test:unit` — unit suite
  - `npm run test:inte` — integration suite (runs integration projects concurrently under the hood)

#### Notes for future agents

- Keep the two user-facing test commands only: `test:unit` and `test:inte`.
- Do not reintroduce `test:stripe` or extra top-level test commands.
- Integration projects in `vitest.workspace.ts` are intentionally split for isolation and are orchestrated by `test:inte`.

## Covered so far (Stripe & checkout testing)

**Session of record:** Payment flow was corrected so stripe event **`checkout.session.completed`** can find the DB row: Stripe always sends **`session.id` (`cs_...`)**, so after `sessions.create` the API persists that id on the order (`updateOrderStripeSessionId`), replacing the pre-Stripe placeholder. Unit tests cover routes and services with mocks; integration tests hit real Stripe test mode when valid env is present for **`server_stripe`** and **`server_stripe_db`**. Work is still TDD-/threat-model–driven around duplicates, latency, and misconfiguration; remaining gaps are listed after the table.

Summarizes what this repo currently exercises for payments:

| Layer | What’s covered |
|--------|-----------------|
| **`stripeService` (unit)** | Wraps `sessions.create` and `constructEvent`; argument shapes; null URL / API / network errors; signature failures (via mocked SDK) |
| **`stripeService` (integration)** | Real Stripe test mode: session creation, real validation errors, stripe event crypto (including replay/tamper rejection) |
| **`POST /api/checkout/create-session` (unit)** | Auth, validation, address ownership, server-side pricing, happy path, Stripe failure, **`updateOrderStripeSessionId`** after success |
| **`POST /api/stripe-events` (unit)** | Missing/invalid signature, `checkout.session.completed` → PAID + event, PAID idempotency, `charge.refunded`, unknown events, missing order no-op |
| **Checkout → PAID/REFUNDED (integration)** | Real HTTP + DB + Stripe + signed stripe events, including refund and duplicate delivery idempotency ([`server_stripe_db.test.ts`](server/tests/integration/server_stripe_db.test.ts)) |

**Not yet covered end-to-end:** CSRF-on checkout in integration tests and broader failure-contract tests for timeouts/rate limits.

## Next Steps

### `create-session` idempotency follow-up

- Guard implemented: equivalent in-flight `PENDING` intent is reused instead of creating duplicate orders.
- Follow-up: add expiry policy for stale pending intents and clearer intent lifecycle metrics.

### PENDING order cleanup

- Orders are created as `PENDING` before Stripe confirms payment
- If the user abandons the Stripe checkout, the order stays `PENDING` forever
- Fix: a scheduled job (cron or Kafka-based) that marks orders `FAILED` after 24 hours in `PENDING` state

### Stripe CLI & manual smoke

- [ ] **Stripe CLI** — `stripe listen --forward-to …/api/stripe-events` for local runs beyond automated tests
- Automated coverage: opt-in integration tests exercise real session creation and real signature verification; full route flow is in `checkoutStripeFlow.integration.test.ts`

I need the backend to be reliable and fully tested before I can start on the frontend.

## After That - Frontend

- [ ] **Cart context**
- [ ] **Checkout page**
- [ ] **Order confirmation page**

## Guest checkout (shadow user) — planned

**Priority:** Deferred behind emergent issues; do not start until those are settled.

**Goal:** Let visitors **pay without signing up first**, while keeping today’s invariant that every **`Order`** has a real **`userId`** and **`addressId`** (both relationally valid). Achieved by creating a **minimal `User` row** per guest (“shadow user”) plus **`Address`** rows exactly like a normal account.

### Why shadow user (vs nullable `Order.userId`)

- Avoids redesigning **`Order`**, **`Address`**, webhooks, and queries that assume **`order.user.email`** exists.
- Tradeoff: **`User`** accumulates guest rows unless merged/upgraded later.

### Database

- Add **`User.isGuest`** (boolean, default `false`).
- Keep **`passwordHash` required:** store a **random bcrypt hash** that is never used for login (guests cannot password-login until upgraded).
- **`email`** stays **`@unique`** — conflict policy is mandatory (below).

### Backend services

- **`createShadowUserWithAddress`** (transaction): create **`User`** (`isGuest: true`, email, newsletter flag if desired, unusable hash) + **`Address`** (same fields as today; first address **`isDefault`** matches existing **`createAddress`** behavior).

**Email conflicts (pick one rule set and document in API errors):**

- Email exists and **`isGuest === false`** → **409** / “Log in to complete checkout” (never attach a guest order to someone else’s account silently).
- Email exists and **`isGuest === true`** → either **reuse + update default address** from checkout or **reject**; choose one for MVP and stick to it.

### HTTP shape (recommended: two-step “pattern A”)

1. **`POST /api/auth/guest`** (name TBD) — body: **email + address fields** (+ CSRF). Creates shadow user + default address; responds with the **same session/JWT cookie** shape as normal login so **`authenticate`** is unchanged.
2. Existing **`POST /api/checkout/create-session`** — unchanged contract: **`addressId` + `items`**, still requires auth after step 1.

**Alternative “pattern B”:** single **`create-session`** body union (authenticated vs guest payload). More branching in one handler; only worth it if frontend strongly prefers one round-trip.

### Auth behavior

- **`login` / `signup`:** reject or branch so **`isGuest`** users **cannot** password-login until **account upgrade** sets a real password and **`isGuest → false`** (future flow).
- **`authenticate`:** no change once guest has a cookie.

### Frontend (when implemented)

- **Cart** remains public.
- **Checkout:** guest path collects **email + address** (inline form already planned on checkout for logged-in empty address book; guest flow extends this with email). Call guest bootstrap → then **`create-session`**.
- **Order confirmation:** **`success_url`** already includes **`session_id`**; ensure auth cookie survives Stripe redirect or add a **narrow public read** by **`session_id`** later if cookie loss appears in the wild.

### Webhooks / events

- **`checkout.session.completed`:** no semantic change — metadata still carries **`orderId`** / **`userId`**; **`order.user.email`** resolves via shadow **`User`**.

### Abuse / ops

- Rate-limit guest bootstrap by **IP** (and optionally **email hash**).
- Metrics: **`isGuest`** user counts vs paid conversions.

### Tests

- Guest bootstrap creates **`User` + `Address`**, **`isGuest === true`**.
- Conflict: existing non-guest email → expected error.
- **`create-session`** after bootstrap reuses existing checkout tests’ assumptions (pending-intent reuse, **`cs_...`** persistence, metadata).

### Follow-up (post-MVP)

- **Upgrade path:** guest completes purchase → email magic link or “Set password” to merge **`isGuest`** into a full account without duplicate **`email`**.

---

## Future Work

### Email templates

`handleOrderPaid` and `handleOrderRefunded` currently call `saveEmail` (adds the address to the subscriber list) but do not send actual transactional emails. Full implementation needs:

- An email provider (e.g. Resend, SendGrid, Postmark)
- HTML/text templates for order confirmation and refund notice
- Order details passed into the template: items, total, shipping address, tracking number when shipped

### Admin order management

- `shipOrder(orderId, trackingNumber)` and `markDelivered(orderId)` are implemented in the service layer but have no HTTP routes or UI
- Needs: admin-only routes (`POST /api/admin/orders/:id/ship`, `POST /api/admin/orders/:id/deliver`), role-based auth middleware, and an admin dashboard page

### Stripe environment config

- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are read from env but not validated at startup (recommended: fail fast in production)
- `stripePriceId` in [`data/products.ts`](server/src/data/products.ts) must be real Stripe **`price_...`** IDs (one-time prices) for live Checkout; keep test vs live IDs out of the wrong environment
