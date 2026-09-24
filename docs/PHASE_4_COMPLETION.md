# Phase 4 Completion Report

Scope, per the agreed implementation plan: payment orders, webhook verification, refunds, and commission/
settlement records — implemented as working vertical slices across the backend, mobile app, provider portal, and
admin portal.

## Definition of done, checked against what shipped

For every feature below: UI implemented, backend endpoint implemented, database persistence works, authentication
and authorization are enforced server-side, loading/empty/error states work, validation works on client and
server, relevant automated tests pass, no secrets are committed, no placeholder action remains.

### Backend (`backend/`)

| Area | What's there |
|---|---|
| Schema | New Alembic migration `554a5b327557_phase4_payments_refunds_settlements` adds `payment_orders`, `payment_webhook_events`, `refunds`, `settlements` |
| Payment adapter | `app/integrations/payments.py` — `PaymentAdapter` interface, `DevPaymentAdapter` (simulates order creation/refunds locally, but signs webhook payloads with **real HMAC-SHA256** so signature verification is genuinely exercised, not skipped, in dev mode), `RazorpayAdapter` (webhook signature verification is the **real, usable Razorpay algorithm** today; order creation and refund issuance are stubs pending real credentials — mirrors the `TwilioSmsAdapter` pattern from Phase 1) |
| Booking → payment link | Payment can only be started for a `CONFIRMED` booking, by that booking's own customer. The service now **requires a `PAID` payment order before a provider can start service** (`CONFIRMED → IN_PROGRESS` is gated in `booking_service.transition`) — verified live, including that Phase 3 bookings created before this gate existed weren't broken by it |
| Webhook processing | `POST /api/v1/payments/webhook` — verifies the signature via the active adapter, records **every** call (valid or not) to `PaymentWebhookEvent` for audit/forensics, is idempotent on `gateway_event_id` (a redelivered event is a no-op), and only updates a `payment_orders` row when the payload names a known `gateway_order_id` |
| Dev payment simulation | `POST /api/v1/payments/{order_id}/dev-complete` (dev-only, refuses in production, only the paying customer can trigger it) builds a real signed webhook payload via the same adapter and feeds it through the **exact same** `process_webhook()` path a real gateway callback would use — this is a simulation of the payment, not a bypass of the verification logic |
| Refunds | `payment_service.issue_refund` — automatically issues a full refund when a `CONFIRMED` (and paid) booking is cancelled by either party; a booking cancelled before payment issues no refund (nothing to refund) — both paths verified by test and live |
| Settlements | `settlement_service.create_settlement_for_booking` — automatically creates one settlement per booking when it reaches `COMPLETED` (only possible once paid, by the gate above), snapshotting `commission_rate` at creation time so a later platform-rate change never retroactively changes a historical settlement. `calculate_commission` is a **pure function** (gross → commission + net, always summing back to gross) |
| Settlement payouts | `GET /api/v1/providers/{id}/settlements` (owner or admin), `GET/POST /api/v1/admin/settlements[/…/pay-out]` (admin-only) — payout is a manual admin action; there is no real bank transfer/payout gateway integration (see risks doc) |
| Config | `PAYMENT_PROVIDER` (dev/razorpay, mirrors `OTP_PROVIDER`), `DEFAULT_COMMISSION_RATE` (0.15), `DEV_PAYMENT_WEBHOOK_SECRET`; production refuses to start with `PAYMENT_PROVIDER=dev`, exactly like the existing OTP guard |
| `BookingOut.payment_status` | Added so booking list/detail responses can show payment state without an extra round trip per booking — `None` before any payment attempt, then `CREATED`/`PAID`/`FAILED`/`REFUNDED` |
| Tests | **28 new pytest tests** (170 total, up from 142): the payment adapter (unique order ids, signature round-trip, tampered-payload rejection, missing-signature rejection, Razorpay stub behavior), commission calculation (rate application, zero-rate, rounding, commission+net always summing to gross), and the full payment API surface (payment only startable for a confirmed booking, only by its customer, order reuse instead of duplicate orders, dev-complete success/failure paths and ownership enforcement, service cannot start before payment and can after, settlement auto-creation with correct math, refund-on-cancel-after-payment vs. no-refund-when-never-paid, webhook signature rejection, settlement RBAC, admin payout including the double-payout-rejected case) |

### Mobile app (`mobile/`)

- **Payment screen** (`PaymentScreen`), reached from a "Pay now" action on a `CONFIRMED`, unpaid booking in the
  Bookings tab: shows the amount, a clearly labeled **"DEV MODE — this simulates a payment. No real gateway is
  connected and no money moves."** banner (never presented as a real charge), and buttons to simulate success or
  failure. A **"Pay now"** button only appears on bookings that actually need it (`CONFIRMED` status and
  `payment_status !== 'PAID'`), including a distinct hint when a previous attempt `FAILED`.
- **Payment result screen** (`PaymentResultScreen`) confirms success/failure and returns to the bookings list.
- No new client-side pure logic needed a Jest test this phase (same reasoning as Phase 3 — payment and settlement
  logic lives server-side by design, since it must be re-verified against the database and signed webhook events
  regardless of what the client believes happened).

### Provider portal (`provider-web/`)

- **Bookings page**: a `CONFIRMED` booking now shows its payment state ("Paid" / "Awaiting customer payment"),
  and the **Start service** button is disabled (with an explanatory tooltip) until payment is confirmed — the UI
  never offers an action the backend would reject.
- **New Earnings page**: summary tiles (total earned, awaiting payout, paid out) and a settlement table (date,
  gross, commission, net payable, status) for the signed-in provider's own business.

### Admin portal (`admin-web/`)

- **New Settlements page**: all settlements across all providers, filterable by status (pending/paid out/all),
  with a "Mark paid out" action per pending row.

## Verification performed

- `pytest -q` (backend) — **170/170 passing** (28 new Phase 4 tests + all 142 Phase 1–3 tests still passing,
  after updating one Phase 3 test that (correctly) now needs to pay before starting a service).
- `ruff check app tests` (backend) — 0 errors.
- `npm test` (mobile) — 41/41 Jest tests passing (unchanged — see note above), `npm run lint` — 0 errors.
- `npm test` (provider-web) — 5/5 Vitest tests passing, lint clean (pre-existing warnings only, in files this
  phase didn't touch).
- `npm test` (admin-web) — 7/7 Vitest tests passing, lint clean (same pre-existing `set-state-in-effect` pattern
  already present in `DashboardPage.jsx`/`StationsPage.jsx`).
- Alembic migration applied to the dev database and re-diffed with `--autogenerate` to confirm the models and
  migration are in sync.
- **Live, end-to-end browser verification across all three frontends in the same session**, watching shared
  backend state propagate between them: booked "Basic Exterior Wash" on mobile as the seeded customer → confirmed
  it on the provider portal (payment correctly showed "Awaiting customer payment", **Start service** correctly
  disabled) → paid via the dev-mode simulation on mobile ("Pay now" disappeared once paid) → started and completed
  the service on the provider portal (**Start service** now enabled, correct payment status) → the provider's
  Earnings page showed the new settlement with exactly correct math (₹249 gross, ₹37.35 commission at 15%,
  ₹211.65 net) → the admin portal's Settlements page listed the same settlement and the "Mark paid out" action
  was confirmed wired to the correct endpoint with the correct amount (the actual click was blocked by the
  automated browser suppressing the native `confirm()` dialog — the payout code path itself is covered by
  `test_admin_can_list_and_pay_out_settlements`).

## Known limitations in what shipped

- **No real payment gateway is connected.** `PAYMENT_PROVIDER=dev` simulates everything; going live needs a real
  Razorpay account and implementing `RazorpayAdapter.create_order`/`create_refund` against the real API (the
  webhook signature verification is already real and correct). See `docs/RISKS_AND_PENDING_INTEGRATIONS.md`.
- **No real payout/banking integration.** Marking a settlement "paid out" is a manual admin bookkeeping action —
  no money actually moves and no bank account details are collected or stored. A real payout phase would need a
  payout API (Razorpay Route/Payouts, Cashfree Payouts, etc.) and provider bank account KYC, which is a
  substantial scope on its own and explicitly out of scope here.
- **Partial refunds are not supported** — a cancellation always refunds the full amount. This matches the
  booking model (bookings aren't partially fulfilled in this phase), so it wasn't a meaningful gap to close now.
- **A payment order does not expire.** A `CREATED` order with no webhook ever received stays `CREATED`
  indefinitely rather than timing out to `FAILED`. This wasn't needed for the dev-mode flow (which resolves
  synchronously) but would matter for a real gateway where a customer can abandon checkout; a scheduled sweep or
  order-expiry check would be natural follow-up work alongside Phase 4/5's other operational tooling.
- Admin's "Mark paid out" and other confirm-gated destructive-ish actions still use the browser's native
  `confirm()`/`alert()`, consistent with the pattern already established for station deletion in Phase 2 — noted
  again here only because it's what prevented a fully automated click-through of that one action during this
  phase's live verification (not a functional gap; the underlying action is tested).

## Not in scope for Phase 4 (by design)

Full provider business tools — verification workflow, staff management, richer earnings/analytics — and admin
moderation tools (Phase 5); expenses, reminders, notifications, weather warnings, reviews/disputes (Phase 6);
broader test/perf/security/accessibility pass and deployment prep, including real payout/banking integration if
still desired at that point (Phase 7). See the root README's phase table and
`RISKS_AND_PENDING_INTEGRATIONS.md`.
