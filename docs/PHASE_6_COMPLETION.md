# Phase 6 Completion Report

Scope, per the agreed implementation plan: expenses, reminders, notifications, weather warning, reviews/disputes
— implemented as working vertical slices across the backend, mobile app, provider portal, and admin portal.

## Definition of done, checked against what shipped

For every feature below: UI implemented, backend endpoint implemented, database persistence works, authentication
and authorization are enforced server-side, loading/empty/error states work, validation works on client and
server, relevant automated tests pass, no secrets are committed, no placeholder action remains.

### Backend (`backend/`)

| Area | What's there |
|---|---|
| Schema | New Alembic migration `2e17fa8d17fc_phase6_expenses_notifications_reviews_disputes` adds `expenses`, `push_tokens`, `notifications`, `reviews`, `disputes` (all new tables — no existing table was altered) |
| Reminders | `app/services/reminder_service.py` — a **pure, DB-free** function (mirrors the booking/verification state machines) computing every insurance/PUC/service reminder across a list of vehicles, most-urgent-first, plus a separate pure `threshold_crossed()` function used for de-duplicating reminder notifications. `GET /vehicles/reminders` aggregates across **all** of a customer's vehicles (Phase 1 only ever showed the default vehicle's dates, computed client-side) |
| Expenses | `Expense` model (category/amount/date/note per vehicle), full CRUD scoped to the vehicle owner (`GET/POST /vehicles/{id}/expenses`, `PUT/DELETE /expenses/{id}`), plus `GET /vehicles/{id}/expenses/summary` backed by a pure `expense_service.summarize()` aggregation function |
| Notifications | `Notification` + `PushToken` models. `app/integrations/push.py` — `PushAdapter` interface, `DevPushAdapter` (logs only), and a **genuinely working** `ExpoPushAdapter` against Expo's real push API (no paid account needed, unlike Twilio/Razorpay — see risks doc). `app/services/notification_service.py` — `notify_user()` (creates the in-app record + best-effort push to every registered device) and `run_reminder_sweep()` (idempotent: scans every active vehicle, creates one notification per vehicle/reminder-type/urgency-threshold the first time it's crossed, never again for that same threshold). `app/workers/reminder_sweep.py` — a standalone script (mirrors `seed.py`'s pattern) meant to run on a daily cron in production; not wired to a scheduler in this repo (see risks doc) |
| Weather | `app/integrations/weather.py` — `WeatherAdapter` interface, `DevWeatherAdapter` (deterministic per location+day, clearly logged as simulated), and a **genuinely working** `OpenWeatherMapAdapter` against the real 5-day forecast API (free-tier key, no business verification needed). `app/services/weather_service.py` — pure `get_car_wash_warning(forecast)` decision function. `GET /providers/{id}/weather-warning?scheduled_at=` — advisory only, never blocks a booking; deliberately **not** covered by the production dev-adapter boot-guard that OTP/payments have, since it's non-critical (documented in the adapter's own docstring) |
| Reviews | `Review` model, one per booking, unique-constrained on `booking_id`. `POST /bookings/{id}/review` (customer only, booking must be `COMPLETED`, one per booking — `review_service.submit_review`), `POST /bookings/{id}/review/response` (provider manager only, once — `review_service.submit_response`), `GET /providers/{id}/reviews` (public, paginated). Provider `average_rating`/`review_count` now appear on both `ProviderSummaryOut` (search results, batch-computed to avoid N+1) and `ProviderDetailOut` |
| Disputes | `Dispute` model with an `OPEN → RESOLVED/DISMISSED` state machine (`dispute_service.py` — only one `OPEN` dispute allowed per booking at a time, mirrors the booking/verification pattern of enforcing the rule in the service layer). `POST /bookings/{id}/dispute` (customer or provider manager), `GET /bookings/{id}/disputes`, `GET /admin/disputes` (filterable by status), `POST /admin/disputes/{id}/resolve` (admin only) |
| Tests | **55 new pytest tests** (256 total, up from 201): 11 pure reminder-computation tests, 9 pure expense-summary tests, 9 pure weather-warning-decision tests (plus adapter determinism checks), and API-level suites for expenses (6), reminders (3), notifications + the reminder sweep (7), reviews (7, including the average-rating aggregation), disputes (8), and the weather-warning endpoint (3) |

### Mobile app (`mobile/`)

- **Home tab**: reminders now come from the new aggregated `/vehicles/reminders` endpoint (every vehicle, not
  just the default one), and a new notification bell with an unread-count badge opens Notifications.
- **New Notifications screen** (nested in the Profile stack): list, mark-one-read, mark-all-read, unread dot per
  row.
- **New Expenses screen** (nested in the Profile stack, opened per-vehicle from Profile): a running total, a
  category-chip add form, and a delete action per entry.
- **Push registration**: `expo-notifications` + `expo-device` (new dependencies, mirroring the `expo-location`
  pattern from Phase 1) request permission and register the device's Expo push token right after sign-in —
  entirely best-effort; the app is fully usable in-app if permission is denied or push isn't available (e.g. web,
  simulator).
- **Booking flow**: a weather-warning banner appears on `CAR_WASH` packages once a time slot is picked, fetched
  from the new weather-warning endpoint using the provider's location and the selected time.
- **Bookings tab**: a `COMPLETED` booking now shows "Rate this service" (a new Review screen: star rating +
  comment, or the existing review + provider's response if already submitted) and "Report a problem" (a new
  Dispute screen: reason + status, blocked from a second `OPEN` submission).
- **Fixed two real, pre-existing bugs** found while wiring reviews: `ProviderCard.js` and `ProviderDetailScreen.js`
  still read the Phase-5-removed `provider.is_verified` field (so the "Verified" badge silently never showed for
  any provider since Phase 5 shipped); both now read `verification_status` correctly, and both now also show the
  new average rating.

### Provider portal (`provider-web/`)

- **New Reviews tab** on My Business: lists reviews (star rating, comment, date) with a one-time "Respond" action
  per review.

### Admin portal (`admin-web/`)

- **New Disputes page**: filterable by status (open/resolved/dismissed/all), with Resolve/Dismiss actions (each
  requiring a resolution note via the same reason-modal pattern Phase 5's Reject-verification flow uses).

## Verification performed

- `pytest -q` (backend) — **256/256 passing** (55 new Phase 6 tests + all 201 Phase 1–5 tests still passing).
- `ruff check app tests` (backend) — 0 errors.
- `alembic check` — no drift after applying the new migration to the dev database.
- `npx oxlint src` (provider-web, admin-web) — 0 errors (only the same pre-existing warning patterns).
- `npm run lint` (mobile) — 0 errors (1 pre-existing warning, unrelated file).
- `npm test` (mobile) — 41/41 Jest tests still passing.
- `npx vitest run` (provider-web) — 5/5 passing. (admin-web) — 14/14 passing.
- **Live, end-to-end browser verification across the mobile app (web target), provider portal, and admin portal
  in the same session**: Home tab showed aggregated reminders across vehicles correctly sorted by urgency;
  created two in-app notifications and confirmed the unread badge, per-item mark-read, and mark-all-read all
  work; added and removed an expense and watched the running total update; booked a `CAR_WASH` service and saw a
  live weather warning ("Rain is likely (88% chance)...") from the dev weather adapter; drove that booking to
  `COMPLETED` and submitted a 4-star review with a comment, which immediately appeared — including the correct
  aggregate rating — on the public provider search list and detail screen; raised a dispute on the same booking
  and confirmed a second submission is blocked while one is open; switched to the provider portal, saw the review
  under the new Reviews tab, and submitted a response that appeared instantly; switched to the admin portal, saw
  the dispute under the new Disputes page, resolved it with a note, and confirmed it correctly dropped out of the
  "Open" filter and reappeared under "Resolved" with the note intact.

## Known limitations in what shipped

- **The reminder sweep is not scheduled.** `app/workers/reminder_sweep.py` is a standalone script, correct and
  idempotent, but nothing in this repository runs it automatically — it needs a daily cron entry in production
  (documented in the script's own docstring and in the risks doc).
- **Weather and push are advisory-only by design, and deliberately not covered by the production dev-adapter
  boot-guard** that blocks starting in production with `OTP_PROVIDER=dev` or `PAYMENT_PROVIDER=dev`. A missing
  weather forecast or a failed push send never blocks or breaks a core flow — this was a deliberate scope
  decision, not an oversight, since these two are enhancements, not transactional core paths like auth/payment.
- **No push-token cleanup for uninstalled apps or expired tokens** — a token is only removed when the app itself
  calls the unregister endpoint (on sign-out) or a fresh registration replaces it (unique on `user_id`+`token`,
  not deduplicated by device otherwise). A production deployment would want to prune tokens that Expo's send API
  reports as invalid.
- **A provider can only reply to a review once**, and a customer can only leave one review per booking — no
  editing after submission. This matches most marketplace review UX and was a deliberate scope boundary, not a
  gap.
- **Disputes have no evidence/photo attachment** — just a text reason and a text resolution note. Matches the
  scope of every other text-only report/reason field already in the app (rejection reasons, cancellation
  reasons); attachments would need the same object-storage dependency already deferred for provider verification
  documents.

## Not in scope for Phase 6 (by design)

Document upload for provider verification (still deferred, needs object storage — see
`docs/RISKS_AND_PENDING_INTEGRATIONS.md`); real payout/banking integration; a scheduled runner for the reminder
sweep. Phase 7 is the broader test/perf/security/accessibility pass and deployment prep — see the root README's
phase table.
