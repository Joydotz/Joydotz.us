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

## Covered

- **Accounts:**
  - Someone can register, log in, see who they are, and log out.
  - Bad sign-up or log-in input is rejected.
  - Successful responses never include their password.
  - A wrong password does not tell you whether the email exists.
  - After too many failed log-ins, further tries are temporarily blocked.
- **Addresses:**
  - A signed-in person can list, add, edit, remove, and pick a default shipping address.
  - Bad address data is rejected.
  - They cannot remove an address that is still used by an order.
  - They can turn the newsletter on or off.
- **Orders in the account:**
  - They can see paid orders and unfinished checkouts.
  - They can continue an unfinished checkout only while the payment page is still open and within the allowed time.
  - They can abandon (“dismiss”) an unfinished checkout.
  - They can change where a **paid** order ships (using one of their addresses).
  - They can open one order’s details only for their own orders—others’ or missing orders are not shown.
- **Shop and mailing list:**
  - The public catalog lists products without exposing secret Stripe price identifiers.
  - The priced shop view shows sensible money fields and still hides those secrets.
  - Visitors can submit an email for the mailing list with validation, and submitting the same email again does not cause an error.
- **Safe browser use:**
  - Actions that change data (except ordinary page loads) require a matching anti-forgery token.
  - Ordinary reads work without that token.
  - Cross-site trick posts are blocked.
  - Flooding the API with too many requests gets a “slow down” response.
- **Starting checkout:**
  - Checkout only works for a signed-in shopper.
  - Bad carts or wrong addresses are rejected.
  - The total is computed from trusted prices, not whatever the browser typed.
  - A successful start opens Stripe’s pay page and ties it to the right order.
  - Starting again with the **same basket** reuses the same unfinished order instead of making a second one.
- **Coming back from Stripe (thank-you page):**
  - Wrong or malformed payment-session links fail.
  - Unpaid or half-done payments fail.
  - If Stripe says “paid” but the order data doesn’t line up, it fails.
  - If Stripe says “paid” but our side is still catching up, the page tells them to wait.
  - When everything matches, they see their completed order.
- **Stripe messages to our server:**
  - Messages without a valid signature are rejected.
  - A real “checkout finished” message marks the order as paid.
  - Sending that same message again does not break anything.
  - A real “refunded” message marks the order refunded.
  - Duplicate refund messages do not break anything.
  - Messages for unknown orders are harmless.
  - Unknown message kinds are ignored harmlessly.
- **Order history and shipping workflow:**
  - New purchases start as “waiting for payment”.
  - Line items keep the product name and price from the moment of sale.
  - Lists show the right person’s orders in newest-first order.
  - Paid history hides the right non-paid states.
  - An order can be marked shipped (with tracking) and then delivered with timestamps.
  - An unfinished checkout can be cancelled from the account.
  - A paid order’s ship-to address can be updated when the new address belongs to the buyer.
  - Two orders cannot share the same Stripe checkout session id.
  - An order cannot point at a missing user or address.
  - An address that still has orders cannot be deleted.
  - Two people updating an order’s status at the same time still leave the data in a sensible state.
- **Stripe checkout (real provider):**
  - Creating a pay session succeeds or fails on bad input.
  - Retrying checkout for the **same** sale reuses the **same** Stripe session.
  - A **new** sale gets a **new** session.
  - Only correctly signed callbacks are accepted (tampered, replayed, or wrong-secret ones are rejected).
  - The full path works: sign in, start checkout, order waits for payment, Stripe reports paid, order becomes paid.
  - Refunds work and duplicate Stripe retries stay safe.

## TODO

- reconcilation
- sweeper
- broader failure-contract tests for timeouts/rate limits.
- Code Coverage

