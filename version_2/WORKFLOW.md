# Development Workflow

## TDD — Strict Order, No Exceptions

For every new service, route, or module, follow these steps in order:

### Step 1 — Function signatures with comments
Write the function signatures in the source file with detailed JSDoc/inline
comments describing:
- What the function does
- What each parameter represents
- What it returns
- Any important side effects or constraints
- Error cases it throws or handles

Do NOT implement the function body yet. Use `throw new Error('not implemented')`
as the placeholder body.

### Step 2 — Write the tests
Write the test file in full BEFORE implementing anything. Tests must:
- Have a file-level JSDoc comment describing what is being tested and the
  overall testing strategy (mocks used, what is covered, what is not)
- Have a section comment above each `describe` block explaining what the
  function/behaviour does and what the tests verify
- Cover the happy path, edge cases, and error cases
- Mirror the exact payload shapes the frontend sends — no hand-crafted
  minimal versions
- Use `MockEventBus` for tests that involve event publishing
- Unit tests mock Prisma and external services
- Integration tests use the real test database (joydotz_test on port 5434)

Run the tests. They must FAIL at this point. If they pass before implementation,
the test is wrong.

### Step 3 — Implement
Implement the function bodies until all tests pass. Do not change the tests
to make them pass — fix the implementation instead.

### Step 4 — Confirm
Run the full test suite to ensure no regressions:
```bash
npx vitest run
```

---

## Project conventions

- **Stack**: Fastify v4, Prisma v7 + @prisma/adapter-pg, Vitest, KafkaJS, Stripe
- **Test database**: joydotz_test on port 5434 — never use the dev database in tests
- **Event system**: All side effects (emails, notifications) go through `EventBus`.
  Routes and webhook handlers receive an `EventBus` instance via dependency
  injection. Tests always use `MockEventBus`.
- **CSRF**: All state-changing routes are protected. Tests use `skipCsrf: true`
  via `buildApp({ skipCsrf: true })`.
- **Validation**: All input fields use `safe()` (email, password) or `safeAddr()`
  (address fields) from `src/lib/validation.ts`. Tests must include malformed
  and malicious payload cases (null bytes, CRLF, XSS, SQL injection,
  object injection, type coercion).
- **Prices**: Always looked up server-side from `src/data/products.ts`.
  Never trust a price from the client.
- **Order status**: PENDING → PAID → SHIPPED → DELIVERED. Also FAILED,
  CANCELLED, REFUNDED.
- **Stripe**: `stripeService.ts` is the only file that imports the Stripe SDK.
  Webhook signature verification is mandatory — never skip it.
- **Kafka**: `KafkaEventBus` publishes to the `order-events` topic.
  `KafkaWorker` consumes it and dispatches to handlers in `src/events/handlers.ts`.
