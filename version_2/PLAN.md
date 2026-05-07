# Payment System — Full Plan

## Architecture Overview

```
Browser → Fastify API → Stripe (hosted checkout)
                ↓                    ↓
           Postgres DB    Stripe Webhook (payment confirmed)
                ↓                    ↓
           Kafka topic  ←  POST /api/webhooks/stripe
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

Key constraint: `Order.stripeSessionId` is `UNIQUE` — the database itself enforces idempotency for duplicate webhook deliveries.

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
* [x] **`POST /api/webhooks/stripe` + tests**
* [x] **`GET /api/account/orders` + `GET /api/account/orders/:id` + tests**
* [x] **Wire into `app.ts`**

**Needs Stripe account**

* [ ] **Real Stripe keys + Stripe CLI end-to-end test**

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
- `getOrderByStripeSessionId` — used by webhook; includes `user.email` for event publishing
- `updateOrderStatus` — transitions to any valid status
- `shipOrder` — sets SHIPPED + trackingNumber + shippedAt
- `markDelivered` — sets DELIVERED + deliveredAt

#### `stripeService.ts`

- `createCheckoutSession` — wraps `stripe.checkout.sessions.create`; mode: payment; embeds `orderId` + `userId` in metadata
- `constructWebhookEvent` — wraps `stripe.webhooks.constructEvent`; passes raw Buffer for signature verification

#### `POST /api/checkout/create-session`

1. Authenticate user (JWT cookie)
2. Validate body: `addressId` (non-empty string) + `items` (array of `{ productId, quantity ≥ 1 }`)
3. Verify address belongs to the authenticated user
4. Resolve product data server-side from `products.ts` — client price fields are ignored
5. Calculate total server-side
6. Create `PENDING` order in DB (with a temp `stripeSessionId`) to obtain an `orderId` before Stripe is called
7. Create Stripe Checkout Session with `orderId` in metadata
8. Return `{ url, orderId }` — client redirects to `url`

Body parsing note: the entire `checkoutRoutes` plugin overrides `application/json` to return raw Buffer. `create-session` manually `JSON.parse`s; the webhook route uses the Buffer directly for signature verification.

#### `POST /api/webhooks/stripe`

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

- All services: unit tests with mocked Prisma
- All routes: unit tests with mocked services + real JWT flow
- Integration tests (real Postgres): CRUD, FK violations, `onDelete: Restrict`, concurrent writes, duplicate session IDs
- Integration tests run sequentially (single file, `fileParallelism: false` on the integration project) to prevent `cleanDb()` race conditions

## Next Steps

### Idempotency for `create-session`

- Currently a new `PENDING` order is created on every call to `create-session`
- If a user clicks "Pay" twice, two `PENDING` orders are created
- Fix: check for an existing `PENDING` order for this user + cart combination before creating a new one, or expire/cancel the previous one

### PENDING order cleanup

- Orders are created as `PENDING` before Stripe confirms payment
- If the user abandons the Stripe checkout, the order stays `PENDING` forever
- Fix: a scheduled job (cron or Kafka-based) that marks orders `FAILED` after 24 hours in `PENDING` state

### Stripe CLI

- [ ] **Real Stripe keys + Stripe CLI end-to-end test**
- [ ] **Stripe webhook signature verification**
- [ ] **tests**

I need the backend to be reliable and fully tested before I can start on the frontend.

## After That - Frontend

- [ ] **Cart context**
- [ ] **Checkout page**
- [ ] **Order confirmation page**

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

- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are read from env but not validated at startup
- `stripePriceId` fields in `data/products.ts` are placeholders (`price_placeholder_*`)
- These need real Stripe Price IDs from the dashboard before going live
