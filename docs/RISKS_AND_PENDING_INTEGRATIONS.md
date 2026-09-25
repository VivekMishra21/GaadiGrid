# Risks and pending external integrations

This repository is **not production-ready**. This document lists exactly what's missing before it could be,
so nothing here is mistaken for a finished product.

## External credentials not yet available (dev adapters in place instead)

| Integration | Current state | What's needed to go live |
|---|---|---|
| SMS / OTP delivery | `OTP_PROVIDER=dev` — OTP is logged (masked phone, never the code) and returned in the API response instead of being texted. Production refuses to start with this setting. | A real provider (Twilio, MSG91, etc.) account, credentials in `SMS_PROVIDER_API_KEY`/`SMS_PROVIDER_SENDER_ID`, and implementing `TwilioSmsAdapter.send_otp` (currently a stub that raises `NotImplementedError`). |
| Payments | `PAYMENT_PROVIDER=dev` (Phase 4) — orders/refunds are simulated locally; webhook signature verification is real HMAC-SHA256 against `DEV_PAYMENT_WEBHOOK_SECRET`, genuinely exercised (not skipped) even in dev mode. Production refuses to start with this setting. `RazorpayAdapter`'s webhook verification is the real, usable algorithm today. | A real Razorpay account, `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET`, and implementing `RazorpayAdapter.create_order`/`create_refund` (currently stubs that raise `NotImplementedError`) against the real API. No real payout/banking integration exists either — see `docs/PHASE_4_COMPLETION.md`. |
| Maps | Partially addressed in Phase 2: the mobile "Navigate here" button opens the device's own installed maps app via a plain URL (no API key needed) — this works today. An **embedded** interactive map on the Explore screen is still not built; `MAPS_PROVIDER`/`GOOGLE_MAPS_SERVER_API_KEY`/`MAPPLS_*` are defined in `.env.example` but unused. | A Google Maps or Mappls API key, and the embedded map view itself. |
| Weather | `WEATHER_PROVIDER=dev` (Phase 6) — forecasts are simulated, deterministically per location+day, clearly logged as such. Unlike SMS/payments, `OpenWeatherMapAdapter` (`WEATHER_PROVIDER=openweathermap`) is a **fully working real implementation today** — OpenWeatherMap's free tier needs only an API key, no business account — and weather is advisory-only (never blocks a booking), so there's no production boot-guard forcing you off `dev` the way there is for OTP/payments. | A free OpenWeatherMap API key in `WEATHER_API_KEY`, and switching `WEATHER_PROVIDER=openweathermap`. Nothing else to implement. |
| Push notifications | `PUSH_PROVIDER=dev` (Phase 6) — pushes are logged, never sent. Unlike SMS/payments, `ExpoPushAdapter` (`PUSH_PROVIDER=expo`) is a **fully working real implementation today** — Expo's push API needs no account for basic sending (`EXPO_ACCESS_TOKEN` only helps with higher rate limits) — and push is advisory-only (in-app notifications are the source of truth), so there's no production boot-guard here either. The reminder sweep that drives push (`app/workers/reminder_sweep.py`) also isn't scheduled anywhere yet — see `docs/PHASE_6_COMPLETION.md`. | Switching `PUSH_PROVIDER=expo` (optionally `EXPO_ACCESS_TOKEN`), and a cron entry to actually run the reminder sweep. |
| Object storage (S3-compatible) | Still not integrated. Phase 5 built the provider verification *workflow* (submit/verify/reject/resubmit) using text fields (business registration number, GST number) specifically to avoid needing this dependency; there's no document/certificate upload yet, and Phase 6's disputes have no evidence-attachment either, for the same reason. | An S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, etc.) and credentials, plus an upload endpoint and file fields on `providers`/`disputes`. |

None of these are faked as working. Station discovery, bookings, payments, provider verification/moderation, and
expenses/reminders/notifications/weather/reviews/disputes are now real (Phases 2–6, "real" meaning genuinely
functional end-to-end, including two adapters — weather and push — that work against their real external APIs
today with no paid account, unlike SMS/payments); document/evidence upload still isn't built, per the phase plan.

## Security items to complete before production (Phase 7)

Phase 7 included a full-codebase security audit (see `docs/PHASE_7_COMPLETION.md`) and closed everything it
found that was fixable without a live production environment. What's left below either needs a real deployment
target to act on, or was a deliberate scope boundary.

- [ ] Rotate `JWT_SECRET_KEY` to a strong, environment-specific secret (the dev value in `backend/.env` is for
      local development only and is gitignored, but double-check it was never committed).
- [ ] Restrict `CORS_ALLOWED_ORIGINS` to real frontend domains (currently `localhost` ports for dev).
- [ ] Add HTTPS/TLS termination in front of the API — the refresh-token cookie is already coded to require it
      (`Secure` flag auto-enables once `ENVIRONMENT=production`, see `docs/DEPLOYMENT.md`), so this is a hard
      prerequisite, not just a hardening nice-to-have, once that flag is set.
- [x] ~~Address the `vitest`/`esbuild` dev-tooling advisories in `admin-web`/`provider-web`~~ — fixed in Phase 7:
      upgraded `vitest` 2.1.8 → 5.0.1 in both apps (also fixed a pre-existing `package-lock.json` drift that was
      silently breaking `npm ci`, i.e. the actual CI pipeline, in both). `npm audit` now reports 0 vulnerabilities
      in both.
- [ ] Add automated dependency scanning (Dependabot or similar) to CI.
- [ ] Load-test the OTP/rate-limiting Redis keys under concurrent access.
- [ ] Review `TwilioSmsAdapter` (or whichever real provider is chosen) for its own security requirements
      (webhook signature verification if the provider sends delivery-status callbacks, credential rotation).
- [ ] Confirm audit logs (`audit_logs` table) are retained/exported per your compliance requirements — nothing
      automatically prunes or archives them yet.
- [ ] Schedule `app/workers/reminder_sweep.py` on a daily cron (or equivalent) in production — it's correct and
      idempotent but nothing runs it automatically today (Phase 6).
- [ ] Prune stale/invalid `push_tokens` rows — nothing removes a token Expo's send API reports as no-longer-valid
      (e.g. the app was uninstalled); today a row is only removed by an explicit sign-out (Phase 6).
- [ ] Consider migrating off `python-jose` (effectively unmaintained upstream) to a maintained JWT library such
      as `PyJWT`. Not urgent: `decode_token` always passes an explicit `algorithms=["HS256"]` allowlist, so the
      historical algorithm-confusion class of `python-jose` advisories doesn't apply here, and the app never uses
      JWE. Flagged in Phase 7's audit as a forward-looking maintenance item, not an active vulnerability.
- [ ] If admin-web/provider-web ever end up deployed on a different registrable domain than the backend API
      (rather than a subdomain of the same site), switch the refresh-token cookie's `SameSite=Lax` to
      `SameSite=None` (still `Secure`) in `backend/app/routers/auth.py`'s `_set_refresh_cookie` — see
      `docs/DEPLOYMENT.md`.

## Performance follow-ups from Phase 7's audit — now closed

Phase 7's performance audit found three lower-priority N+1/index gaps beyond the ones fixed in the initial pass,
initially left as documented follow-ups since fixing them meant touching code already live-verified across
several earlier phases. All three have since been closed, each with a dedicated regression test proving the
batched query returns the *correct* per-row data (not another row's), not just that it runs:

- [x] ~~Station search's queue-status lookup ran once per station in a page of results.~~ Fixed:
      `queue_status_service.get_station_queue_statuses` batches it with a window function (ranks each station's
      reports, keeps the top 200 per station — same cap the single-station version always had), used by both
      station search and favorites. Regression test:
      `test_search_results_carry_each_stations_own_queue_status_not_mixed_up`.
- [x] ~~Booking list responses fetched the provider, package, and latest payment order individually per
      booking.~~ Fixed: `bookings.py::_to_out_batch` batches all three per page (new `provider_repository.get_by_ids`,
      `service_package_repository.get_by_ids`, `payment_order_repository.get_latest_for_bookings` — the last via
      the same window-function pattern). Regression test:
      `test_customer_bookings_mine_carries_each_bookings_own_details_not_mixed_up`.
- [x] ~~`reviews`/`disputes` didn't have the same kind of composite index `notifications` got.~~ Fixed: added
      `(provider_id, created_at)` on `reviews` (serves the public reviews list) and `(status, created_at)` on
      `disputes` (serves the admin disputes list, which always filters by status) — migration `10183b1f6b80`.

## Data model gaps intentional to Phases 1–6

The full spec lists 30+ tables (`coupons`, provider verification documents, etc.). Phases 1–6 built `users`,
`refresh_tokens`, `otp_requests`, `user_consents`, `addresses`, `vehicles`, `audit_logs`, `fuel_stations`,
`fuel_types`, `fuel_prices`, `fuel_availability`, `station_facilities`, `queue_reports`, `queue_report_flags`,
`favorite_stations`, `providers` (now with verification fields), `provider_staff_members`,
`provider_availability`, `service_packages`, `bookings`, `payment_orders`, `payment_webhook_events`, `refunds`,
`settlements`, `expenses`, `push_tokens`, `notifications`, `reviews`, `disputes`. What's left — verification/
dispute-evidence *documents* specifically, and `coupons` — needs the still-deferred object-storage dependency
above; there's no more Phase in the plan dedicated to adding new tables (Phase 7 is test/perf/security/
accessibility/deployment prep), so revisit this list only if new product scope is added.

## No real payout/banking integration

Marking a settlement "paid out" (`docs/PHASE_4_COMPLETION.md`) is a manual admin bookkeeping action — no money
actually moves, and no provider bank account details are collected or stored anywhere. A real payout phase would
need a payout API (Razorpay Route/Payouts, Cashfree Payouts, etc.) plus provider bank account KYC, which is
substantial scope on its own and was deliberately not attempted as a side effect of Phase 4.

## Timezone handling is single-locale (India) only

Provider working hours, station opening hours, and booking slot computation all assume a single named timezone
(`app/core/timezone.py::IST`, `Asia/Kolkata`) — there is no per-user or per-provider timezone field anywhere in
the schema. This was the source of a real bug found and fixed during Phase 3's live verification (booking slots
displayed 5.5 hours off from what the provider actually configured) — see `docs/PHASE_3_COMPLETION.md`. If this
app ever needs to support providers or customers outside India, this is the one place that assumption needs to
be generalized to a real per-entity timezone.

## A pre-existing, unrelated project on this machine

During Phase 1 setup, a **separate** GaadiGrid project was discovered at `P:\GaadiGridApp\gaadigrid\` with its
own (further along) implementation of a similar spec. Per explicit instruction, this repository
(`P:\GaadiGrid\gaadigrid\`) was built independently and that other project was left untouched. Docker Compose
resources here are deliberately namespaced (`gaadigrid_customer_app` project name, `-customer-` in container
names, host ports 5433/6380 instead of the defaults) specifically so the two can never collide, even though both
directories happen to be named `gaadigrid`. If you intend to consolidate the two projects, treat that as a
deliberate decision requiring a full review of both — don't assume either one's code, migrations, or data
should simply overwrite the other's.
