# GaadiGrid

**Fuel. Clean. Care. Drive.**

GaadiGrid helps vehicle owners find petrol, diesel, CNG and EV stations; view fuel prices and live queue
information; calculate whether travelling to a cheaper station is worth it; book car-cleaning and vehicle-care
services; pay online; and manage vehicle-related reminders and expenses.

This is a monorepo containing four connected applications:

```
gaadigrid/
├── mobile/          Customer app — React Native + Expo (JavaScript)
├── admin-web/       Admin portal — React + Vite (JavaScript)
├── provider-web/    Partner portal — React + Vite (JavaScript)
├── backend/         Shared API — FastAPI + PostgreSQL/PostGIS + Redis
├── branding/        Logo source files
├── docs/            Phase reports, risk log
├── docker-compose.yml
└── README.md
```

> **Status: Phase 7 of 7 complete.** See [`docs/PHASE_1_COMPLETION.md`](docs/PHASE_1_COMPLETION.md),
> [`docs/PHASE_2_COMPLETION.md`](docs/PHASE_2_COMPLETION.md), [`docs/PHASE_3_COMPLETION.md`](docs/PHASE_3_COMPLETION.md),
> [`docs/PHASE_4_COMPLETION.md`](docs/PHASE_4_COMPLETION.md), [`docs/PHASE_5_COMPLETION.md`](docs/PHASE_5_COMPLETION.md),
> [`docs/PHASE_6_COMPLETION.md`](docs/PHASE_6_COMPLETION.md) and [`docs/PHASE_7_COMPLETION.md`](docs/PHASE_7_COMPLETION.md)
> for exactly what is built and tested, and
> [`docs/RISKS_AND_PENDING_INTEGRATIONS.md`](docs/RISKS_AND_PENDING_INTEGRATIONS.md) for what is still missing
> before any of this could go to production. **All 7 planned phases are now complete — this is feature-complete
> against the original plan — but nothing in this repository should be described as production-ready** until
> that document's checklist (real SMS/payment credentials, JWT secret rotation, TLS, CORS origins, etc.) is
> cleared. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for how each service is actually built and deployed.

## What's built so far (Phases 1–7)

- Repository/monorepo scaffold for all four apps, all in JavaScript (no TypeScript).
- Backend: FastAPI app with structured logging, security headers, rate limiting, a consistent
  `{success, data|error}` response envelope, `/health` and `/ready` endpoints, versioned `/api/v1` routes,
  OpenAPI docs at `/docs`.
- Database: PostgreSQL + PostGIS, SQLAlchemy 2.0 models, Alembic migrations for `users`, `refresh_tokens`,
  `otp_requests`, `user_consents`, `addresses`, `vehicles`, `audit_logs` (Phase 1); `fuel_stations`,
  `fuel_types`, `fuel_prices`, `fuel_availability`, `station_facilities`, `queue_reports`, `queue_report_flags`,
  `favorite_stations` (Phase 2, with a PostGIS geography column + GIST index for geo search); `providers`,
  `provider_availability`, `service_packages`, `bookings` (Phase 3); `payment_orders`, `payment_webhook_events`,
  `refunds`, `settlements` (Phase 4); `provider_staff_members`, plus verification fields on `providers`
  (Phase 5); `expenses`, `push_tokens`, `notifications`, `reviews`, `disputes` (Phase 6).
- Auth: phone-number OTP login/signup for customers, email+password login for admin/provider staff, JWT access
  (15 min) + refresh (30 day) tokens with rotation and **reuse detection** (replaying a rotated refresh token
  revokes its whole family), logout, delete-account request, mandatory terms/privacy consent, a clearly-labeled
  **development** SMS adapter (`OTP_PROVIDER=dev` — logs that an OTP was issued, never the OTP itself; a real
  provider is not wired up yet — see the risks doc).
- RBAC: `CUSTOMER`, `PROVIDER_OWNER`, `PROVIDER_STAFF`, `ADMIN`, `SUPER_ADMIN` roles enforced **server-side** on
  every protected endpoint, re-checked from the database on every request (not trusted from the JWT claim), so a
  role change or deactivation takes effect immediately. Demonstrated end-to-end by `GET /api/v1/admin/users`.
- Customer profile, addresses, and full vehicle CRUD (add/edit/delete, default-vehicle handling, insurance/PUC/
  service reminder dates), with ownership isolation enforced server-side.
- Mobile app: Splash → Onboarding (skippable, remembered) → Login → OTP verification (resend countdown,
  attempt-limit errors surfaced from the server) → Location permission (real `expo-location` prompt) → Add
  vehicle → Main app. Bottom tabs: Home (real vehicle summary + reminder countdowns across every vehicle, plus a
  notifications bell with an unread badge), Explore (real station search/detail/queue-reporting/detour
  calculator), Services (real provider/package browsing, a full booking flow with a live weather-warning banner
  for car-wash bookings, and provider ratings), Bookings (real booking list with live status, a "Pay now" flow
  once confirmed, cancel, rate a completed service, and report a problem), Profile (real profile, vehicle
  management, per-vehicle expense tracking, notifications, logout, delete-account request).
- Admin portal: email/password login, role-gated (a signed-in customer or provider sees an honest "wrong
  portal" message instead of a broken screen), a real paginated users table backed by the RBAC-protected API
  (filterable by role/search/active status, with deactivate/reactivate moderation actions that respect
  self-lockout and admin-lockout rules), a Providers page (verify/reject-with-reason/deactivate/reactivate any
  provider, filterable by verification status), a Disputes page (filter by status, resolve/dismiss with a
  required note), a Stations management page (create/edit stations, prices, facilities), and a Settlements page
  (view/filter all provider settlements, mark payouts complete).
- Provider portal: same auth pattern, gated to `PROVIDER_OWNER`/`PROVIDER_STAFF`; a real sidebar with My Business
  (create/edit business profile, service packages, working hours, a verification workflow — submit registration/
  GST details, see pending/verified/rejected status with the admin's reason, resubmit — staff management — link/
  list/remove `PROVIDER_STAFF` accounts by email — and a Reviews tab to see and respond to customer reviews),
  Bookings (confirm/reject/start/complete incoming bookings, gated on payment status, now also usable by a linked
  staff member, not just the owner), and Earnings (settlement history with commission breakdown).
- Station discovery (Phase 2): geo/text/fuel-type station search with PostGIS-backed nearest-first ordering,
  full station detail (prices with freshness, facilities, official availability), crowdsourced queue/CNG-status
  reporting with a trust- and recency-weighted combination algorithm (verified partner reports count more,
  expired or repeatedly-flagged reports never show as live), favorites, and a pure client-side worth-the-detour
  calculator. Mobile Explore tab, station detail screen, and admin Stations management page all wired to the
  real API — see [`docs/PHASE_2_COMPLETION.md`](docs/PHASE_2_COMPLETION.md).
- Car-care marketplace (Phase 3): provider self-service business profiles, service packages, weekly working
  hours, a real slot-availability computation (excludes past times and conflicting bookings), and a booking state
  machine (`PENDING → CONFIRMED/REJECTED → IN_PROGRESS → COMPLETED`, cancellable before service starts) enforced
  server-side by actor role. Mobile Services/Bookings tabs and the provider portal's My Business/Bookings pages
  are wired to the real API and verified live end-to-end across both apps — see
  [`docs/PHASE_3_COMPLETION.md`](docs/PHASE_3_COMPLETION.md).
- Payments (Phase 4): a payment adapter pattern (`DevPaymentAdapter`/`RazorpayAdapter`, mirroring the SMS adapter
  from Phase 1) with **real HMAC-SHA256 webhook signature verification** even in dev mode, a booking state
  machine gate requiring payment before service can start, automatic full refunds on cancellation-after-payment,
  and automatic commission/settlement records on completion. Mobile's Bookings tab, the provider portal's
  Bookings/Earnings pages, and a new admin Settlements page are all wired to the real API and verified live
  end-to-end across all three frontends in one session — see
  [`docs/PHASE_4_COMPLETION.md`](docs/PHASE_4_COMPLETION.md).
- Provider/admin verification and moderation (Phase 5): a pure, testable verification state machine
  (`UNVERIFIED → PENDING → VERIFIED/REJECTED`, with resubmission after rejection) enforced server-side by actor
  role, a unified owner-or-staff-or-admin authorization check now shared by the providers/bookings/payments
  routers (closing a real gap where `PROVIDER_STAFF` accounts couldn't act on their employer's bookings), and
  admin moderation (deactivate/reactivate any user or provider, with self-lockout and admin-lockout protection).
  The provider portal's Verification and Staff tabs and the admin portal's Providers page and extended Dashboard
  are all wired to the real API and verified live end-to-end — see
  [`docs/PHASE_5_COMPLETION.md`](docs/PHASE_5_COMPLETION.md).
- Expenses, reminders, notifications, weather, reviews/disputes (Phase 6): per-vehicle expense tracking with a
  category breakdown; insurance/PUC/service reminders now aggregated server-side across every vehicle a customer
  owns, not just the default one; a real (if not yet scheduled) push-notification pipeline — `app/integrations/
  push.py`'s `ExpoPushAdapter` and `app/integrations/weather.py`'s `OpenWeatherMapAdapter` are both **genuinely
  working real integrations today**, unlike the SMS/payment adapters, since Expo push and OpenWeatherMap need no
  paid business account; a weather-warning banner on car-wash bookings; and a reviews/disputes system (one review
  per completed booking with a provider response, and a dispute state machine admins resolve). Wired into the
  mobile app (Home/Profile/Bookings/booking flow), the provider portal (a new Reviews tab), and the admin portal
  (a new Disputes page), and verified live end-to-end across all of them in one session — see
  [`docs/PHASE_6_COMPLETION.md`](docs/PHASE_6_COMPLETION.md).
- Tests, performance, security review, accessibility, deployment prep (Phase 7): a full-codebase security audit
  that found and fixed real issues — the web portals' 30-day refresh tokens moved out of `localStorage` into an
  `httpOnly` cookie, missing rate limiting on `/auth/refresh` and the payment webhook, a timing side-channel on
  staff login, missing CSP/HSTS headers, a privilege gap letting any linked staff member add/remove other staff,
  and admin station-management endpoints that were skipping audit logging; a separate performance audit that
  fixed real N+1 queries (the admin providers list, station favorites) and added missing indexes; new Dockerfiles
  for admin-web/provider-web plus `.dockerignore` files everywhere (added after discovering their absence would
  have baked `.env`/`venv` into the backend image); CI now builds every Docker image, not just lints/tests; and a
  targeted accessibility pass. Also caught and fixed, incidentally: both web portals' `package-lock.json` had
  drifted out of sync, silently breaking the exact `npm ci` command CI runs — see
  [`docs/PHASE_7_COMPLETION.md`](docs/PHASE_7_COMPLETION.md) for the full list and how each fix was verified.

**Not in scope, even now that all 7 phases are done** (deliberate scope boundaries — see the risks doc):
document/evidence upload for provider verification and disputes (needs object storage), a scheduler actually
running the reminder sweep, real payout/banking integration (settlement payout is a manual admin bookkeeping
action, not a real bank transfer), and everything in the risks doc's production checklist that needs a real
deployment target to act on (JWT secret rotation, CORS origin restriction, TLS termination, real SMS/payment
provider credentials).

## Phase plan

| Phase | Scope | Status |
|---|---|---|
| 1 | Repo setup, env config, database, auth, roles, customer profile, vehicle management | **Done** |
| 2 | Station map/list, fuel prices, station details, queue reporting, worth-the-detour calculator | **Done** |
| 3 | Providers, services, packages, slots, booking state machine, customer booking screens | **Done** |
| 4 | Payment orders, webhook verification, refunds, commission/settlement records | **Done** |
| 5 | Provider portal and admin portal: verification, moderation, full business tools | **Done** |
| 6 | Expenses, reminders, notifications, weather warning, reviews/disputes | **Done** |
| 7 | Automated tests, performance, security review, accessibility, deployment prep | **Done** |

## Local setup

### Prerequisites
- Node.js 22+, npm
- Python 3.12+
- Docker (for PostgreSQL/PostGIS + Redis)

### 1. Start infrastructure

```bash
docker compose up -d postgres redis
```

This starts Postgres (PostGIS-enabled) on `localhost:5433` and Redis on `localhost:6380`, under a compose
project named `gaadigrid_customer_app` — deliberately not the directory name, so it can never collide with
another "gaadigrid" project elsewhere on the same machine.

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\pip install -r requirements-dev.txt   # or venv/bin/pip on macOS/Linux
copy .env.example .env                              # or cp on macOS/Linux — defaults already match the ports above, PAYMENT_PROVIDER=dev
venv\Scripts\python -m alembic upgrade head
venv\Scripts\python -m app.workers.seed             # optional: dev accounts + sample stations + a sample provider
venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs · Health: http://localhost:8000/health · Readiness: http://localhost:8000/ready

Seeded dev accounts (printed by the seed command, never real users):
- Customer OTP login: `+919810000001` (OTP is returned in the API response in dev mode, never sent via SMS)
- Admin / Provider Owner / Provider Staff / Super Admin: `*.dev` emails, password `GaadiGrid@Dev123`

### 3. Mobile app (Expo)

```bash
cd mobile
npm install
copy .env.example .env    # defaults to http://localhost:8000
npm run web                # or: npm run android / npm run ios
```

### 4. Admin portal

```bash
cd admin-web
npm install
npm run dev                # http://localhost:5173
```

### 5. Provider portal

```bash
cd provider-web
npm install
npm run dev                # http://localhost:5174
```

## Running tests

```bash
cd backend && venv\Scripts\python -m pytest -q          # 265 tests
cd mobile && npm test -- --watchAll=false                # 41 tests
cd admin-web && npm test                                 # 14 tests
cd provider-web && npm test                               # 5 tests
```

Lint:

```bash
cd backend && venv\Scripts\python -m ruff check app tests
cd mobile && npm run lint
cd admin-web && npm run lint
cd provider-web && npm run lint
```

## Android build

This is a managed Expo project. For a local Android build:

```bash
cd mobile
npx expo prebuild -p android   # generates the native android/ project (gitignored)
npx expo run:android           # requires Android Studio / an emulator or device
```

For a distributable build without a local Android SDK, use [EAS Build](https://docs.expo.dev/build/introduction/)
(`npx eas build -p android`) — requires an Expo account and `eas.json`, not configured in this repo yet.

## Deployment checklist (not yet cleared — see the risks doc)

- [ ] Real SMS provider wired up and `OTP_PROVIDER` set to it (never `dev`) outside local development
- [ ] `JWT_SECRET_KEY` set to a strong, unique secret per environment (never the repo's dev default)
- [ ] Real Razorpay/Cashfree keys and webhook secret configured, `PAYMENT_PROVIDER` switched off `dev`, and
      `RazorpayAdapter.create_order`/`create_refund` implemented against the real API (webhook signature
      verification is already real — see `docs/PHASE_4_COMPLETION.md`)
- [ ] S3-compatible storage configured, and a document-upload endpoint built, for provider verification
      documents/service photos (Phase 5's verification workflow itself is done — see
      `docs/PHASE_5_COMPLETION.md` — this is only the file-upload follow-up)
- [ ] Maps provider API key configured for an embedded map (Phase 2 — the "Navigate here" deep link already
      works without one)
- [ ] Weather and push switched off `dev` (`WEATHER_PROVIDER=openweathermap` + `WEATHER_API_KEY`,
      `PUSH_PROVIDER=expo` + optional `EXPO_ACCESS_TOKEN`) — both adapters are already fully implemented against
      their real APIs, this is just a config flip (Phase 6)
- [ ] `app/workers/reminder_sweep.py` scheduled on a daily cron (Phase 6 — see the risks doc)
- [ ] `CORS_ALLOWED_ORIGINS` restricted to real frontend origins
- [ ] HTTPS/TLS termination in front of the backend — required, not optional, once deployed: the Phase 7
      refresh-token cookie's `Secure` flag auto-enables under `ENVIRONMENT=production` (see
      `docs/DEPLOYMENT.md`), and without real TLS the browser will silently refuse to store it
- [ ] Database backups configured (see below)
- [x] ~~Full Phase 7 test/security/accessibility pass complete~~ — done; see
      `docs/PHASE_7_COMPLETION.md` and the remaining (environment-dependent) items in the risks doc

## Backup and migration notes

- All schema changes go through Alembic (`alembic revision --autogenerate -m "..."`, then review the generated
  file before applying — the `postgis/postgis` image ships a large set of tiger-geocoder/topology tables that
  autogenerate will otherwise try to drop; `backend/alembic/env.py` already filters these out).
- No backup automation exists yet. For production, configure `pg_dump` on a schedule (or your hosting
  provider's managed Postgres backups) before real user data is stored.
- See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for how each service is actually built into a deployable image
  (Dockerfiles for all three web-facing apps as of Phase 7) and the production migration process.

## Definition of done

A feature in this repository is only marked done when: the UI is implemented, the backend endpoint is
implemented, database persistence works, authentication and authorization are enforced server-side, loading/
empty/error states work, validation works on both client and server, relevant automated tests pass, docs are
updated, no secrets are committed, and no placeholder action remains.
