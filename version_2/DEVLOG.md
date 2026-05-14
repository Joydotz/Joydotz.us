# Joydotz Development Log

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

## Implemented Features

**Infrastructure**

- **Docker Compose** — add Kafka container for local development (KRaft mode, no Zookeeper needed)
- **Prisma migration** — `Order`, `OrderItem`, `OrderStatus` (drop `EventQueue`)

**Event system**

- `**EventBus` interface + `MockEventBus`**
- `**KafkaEventBus`** — implements `EventBus` using `kafkajs`, publishes to `order-events` topic
- **Kafka worker** — consumer on `order-events` topic, dispatches to handlers
- **Event handlers** — `ORDER_PAID`, `ORDER_REFUNDED`

**Backend**

- `**orderService.ts` + tests**
- `**stripeService.ts` + tests**
- `**POST /api/checkout/create-session` + tests**
- `**POST /api/stripe-events` + tests**
- `**GET /api/account/orders` + `GET /api/account/orders/:id` + tests**
- **Wire into `app.ts`**

**Stripe integration**

- **Test-mode keys + secrets + price id**
  - three weakly validated on startup
- **Stripe CLI** — local `stripe listen --forward-to …/api/stripe-events` (optional beyond automated tests)
- **Completed server checkout -> stripe -> server process order workflow**
- **Checkout session idempotency**
  - Equivalent in-flight `PENDING` intent is reused
- **Reconcilation if payment not confirmed from stripe**
  - success page fallback: retry validating order with stripe with exponential backoffs
  - daily sweeper validating pending order before deleting it

**Frontend**

- **Cart context**
- **Checkout page**
- **Order confirmation page**

**Pending order cleanup**

- Orders are created as `PENDING` before Stripe confirms payment
- Added a sweeper that:
  - runs every 24 hours
  - verifies if a pending order is valid from stripe. restore valid orders.
  - else, remove pending orders

---

## Next Steps

### Email templates

`handleOrderPaid` and `handleOrderRefunded` currently call `saveEmail` (adds the address to the subscriber list) but do not send actual transactional emails. Full implementation needs:

Features to achieve:

- Account email verification (register / forgot password)
- Client email service (order confirmation / refund)
- Admin email service (send email to admin inbox)

Implementation:

- An email provider (e.g. Resend, SendGrid, Postmark)
- DNS config (SPF, DKIM, DMARC)
- HTML/text templates for order confirmation and refund notice
- Order details passed into the template: items, total, shipping address, tracking number when shipped

### Wire Kafka into app

- Kafka is declared but never used. Think of a way to integrate Kafka reliability into the app

### Admin order management

- `shipOrder(orderId, trackingNumber)` and `markDelivered(orderId)` are implemented in the service layer but have no HTTP routes or UI
- Needs: admin-only routes, role-based auth middleware, and an admin dashboard page (`/api/admin`)

---

# Tests

## Unit Tests

- **Accounts:**
  - Someone can register, log in, see who they are, and log out.
  - Bad sign-up or log-in input is rejected.
  - Successful responses never include their password.
  - A wrong password does not tell you whether the email exists.
  - After too many failed log-ins, further tries are temporarily blocked.
- **Addresses:**
  - Authenticated user can list, add, edit, remove, and pick a default shipping address.
  - A user can't access other people's addresses.
  - Bad address data is rejected.
  - Authenticated user cannot remove an address that is still used by an order.
- **Orders & Order History**
  - Authenticated user can only look up orders that belong to them.
  - Authenticated user can see paid orders and unfinished checkouts.
  - Authenticated user can continue an unfinished checkout only before the session expires.
  - Authenticated user can abandon (“dismiss”) an unfinished checkout.
  - An order's address can be edited before it's shipped.
- **Order history:**
  - Paid history hides pending and cancelled orders because they are useless to user.
  - An unfinished checkout can be cancelled from the account.
  - A paid order’s ship-to address can be updated when the new address belongs to the buyer.
- **Email subscription:**
  - Visitors can submit an email for the mailing list with validation.
  - No errors raise when email already exists (mitigate side channel).
  - Authenticated user can opt in and out email subscription.
- **Product list:**
  - The public catalog from `/api/catalog` lists products without exposing secret Stripe price ids.
  - The priced product list from `/api/products` displays numeric prices from Stripe without exposing secret Stripe price ids.
- **Safe browser use:**
  - State changing requests (except GET requests) require a matching anti-forgery (csrf) token.
  - Cross-site trick posts are blocked.
  - Rate limiting: flooding the API with too many requests gets a “slow down” response.
- **Starting checkout:**
  - Checkout only works for an authenticated user.
  - Bad carts or wrong addresses are rejected.
  - The total is computed from trusted prices, not whatever the browser typed.
  - A successful start opens Stripe’s pay page and ties it to the right order.
  - Starting again with the **same basket** reuses the same unfinished order instead of making a second one.
- **Order confirmation page:**
  - Wrong or malformed payment-session links fail.
  - Unpaid or half-done payments fail.
  - If Stripe says “paid” but the order data doesn’t line up, it fails.
  - If Stripe says “paid” but our side is still catching up, the page tells them to wait.
  - When everything matches, the user sees their completed order.
- **Messages from Stripe API (mocked):**
  - Messages with invalid or missing signatures are rejected. (Integration test will reject expired signature.)
  - A valid signed “checkout finished” message marks the order as paid.
  - Idempotency: Sending that same message again has no duplicate effect.
  - A valid signed “refunded” message marks the order refunded.
  - Idempotency: Duplicate refund messages has no duplicate effect.
  - Messages for unknown orders are dropped harmlessly.
  - Unknown message kinds are dropped harmlessly.
- **Environment bootstrap:**
  - In dev test mode, placeholder Stripe secrets are allowed when the app runs.
  - In dev non-test mode, if the webhook secret is missing, the app refuses to start.
  - In production, placeholder Stripe secrets are rejected and the app refuses to start.
  - In production, the app requires secrets to start.

## Integration Tests

### Tests Against Actual Databases
  - New purchases start as “pending” status.
  - Line items keep the product name and price from the moment of sale.
  - Lists only show orders that belong to authenticated user. The list is in newest-first order.
  - An order can be marked shipped (with tracking) and then delivered with timestamps.
  - Two orders cannot share the same Stripe checkout session id.
  - An order cannot point at a missing user or address.
  - An address that still has orders cannot be deleted.
  - Two people setting an order’s status to PAID at the same time won't result error and status will be PAID.

### Tests Against Actual Stripe API
  - Messages with invalid, missing, or expired signatures are rejected.
  - Creating a pay session fails on bad input. Otherwise it succeeds.
  - Idempotency: Repeating checkout for the **same** order reuses the **same** Stripe session.
  - A **new** order gets a **new** session.
  - Idempotency: Refunds work and duplicate Stripe retries stay safe.
  - The full path works: sign in, start checkout, order waits for payment, Stripe reports paid, order becomes paid.

## TODO

- reconcilation
- sweeper
- broader failure-contract tests for timeouts/rate limits.
- Code Coverage

