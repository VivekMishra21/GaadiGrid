# Phase 1 Completion Report

Scope, per the agreed implementation plan: repository setup, environment configuration, database, authentication,
roles, customer profile, vehicle management — implemented as working vertical slices across all four apps.

## Definition of done, checked against what shipped

For every feature below: UI implemented, backend endpoint implemented, database persistence works, authentication
and authorization are enforced server-side, loading/empty/error states work, validation works on client and
server, relevant automated tests pass, no secrets are committed, no placeholder action remains.

### Backend (`backend/`)

| Area | What's there |
|---|---|
| Config | `app/core/config.py` (pydantic-settings) — all values from environment, `.env.example` documents every variable, production refuses to start with `OTP_PROVIDER=dev` |
| Database | PostgreSQL 16 + PostGIS (enabled now so Phase 2 station geo-columns are additive-only migrations), SQLAlchemy 2.0 sync models, Alembic migration `7ddefec23ca4_phase1_initial_schema` |
| Tables | `users`, `refresh_tokens`, `otp_requests`, `user_consents`, `addresses`, `vehicles`, `audit_logs` — soft-delete columns, timestamps, indexes, FKs, and a per-owner unique constraint on vehicle registration number |
| Auth | OTP request/verify with Redis-backed resend cooldown and hourly request limits, per-OTP attempt limiting, salted-hash OTP storage (never plaintext), full_name/consent validation happens *before* the OTP is consumed (a forgotten name doesn't burn the code — regression-tested), JWT access (15 min) + refresh (30 day) tokens, refresh rotation with **token-family reuse detection** (replaying an already-rotated refresh token revokes the whole family), logout, delete-account request, mandatory terms/privacy consent recorded per user, email+password login for staff roles |
| RBAC | `app/middleware/rbac.py` — `require_roles(...)` dependency re-checks the role from the database on every request (not from the JWT claim), so a role change takes effect immediately; demonstrated end-to-end by the admin-only `GET /api/v1/admin/users` |
| Users | `GET/PUT /api/v1/users/me` |
| Vehicles | Full CRUD, ownership checks (a user cannot read/edit/delete another user's vehicle — verified by test), exactly one default vehicle enforced server-side, deleting the default promotes another automatically, duplicate registration returns a clean 409 (not a raw 500) |
| Addresses | Full CRUD with the same default-address handling pattern as vehicles |
| SMS | `app/integrations/sms.py` — `SmsAdapter` interface, `DevSmsAdapter` (logs a masked phone number, never logs the OTP itself) is active by default; a `TwilioSmsAdapter` stub is present but raises `NotImplementedError` until real credentials are supplied |
| API contract | Consistent `{success, data | error}` envelope, pagination (`PaginatedResponse`/`PaginationMeta`), versioned `/api/v1` prefix, OpenAPI docs at `/docs`, `/health` and `/ready` (checks DB + Redis) |
| Security | Bearer JWT auth, secure headers middleware, restricted CORS, fixed-window rate limiting via Redis (defense-in-depth in front of the finer-grained OTP-specific limits), structured logging that masks phone numbers and never logs tokens/OTPs/secrets, audit log table + `record_audit_event` used on every auth-sensitive action |
| Tests | **42 pytest tests** — auth signup/login, OTP correctness/expiry/reuse/attempt-limits/resend-cooldown/hourly-rate-limit, refresh rotation + reuse detection, logout, delete-account request, RBAC allow/deny for every role (including a same-token role-change-takes-effect-immediately test), vehicle CRUD + validation + ownership isolation + default-vehicle logic, address CRUD, profile update + email-uniqueness conflict |
| Dev data | `app/workers/seed.py` — refuses to run if `ENVIRONMENT=production`, creates clearly-labeled `[DEV]`-prefixed accounts (one per role) and one sample vehicle + address in Noida |

### Mobile app (`mobile/`, Expo SDK 57, React Native 0.86, JavaScript)

- Navigation: Splash → Onboarding (skippable, remembered via `AsyncStorage`) → Login → OTP verification (resend
  countdown, attempt-limit errors surfaced from the server) → Location permission (real `expo-location` prompt) →
  Add vehicle → Main app. Implemented as a single `Stack.Navigator` whose *registered screen set* changes with
  auth/vehicle-loaded state, so the flow resets correctly with no manual navigation-state plumbing.
- Bottom tabs: Home (real vehicle summary + insurance/PUC/service reminder countdowns, pull-to-refresh),
  Explore/Services/Bookings (explicit, honest "coming in Phase 2/3" screens — not fake buttons), Profile (real
  profile, vehicle add/edit/remove, logout with confirmation, delete-account request with confirmation).
- API client: central Axios instance, JWT in `SecureStore` on native (web preview — used only for this session's
  verification, never a shipping target — falls back to `AsyncStorage` since `expo-secure-store` has no web
  implementation), automatic refresh-on-401 with request queuing, normalized error shape.
- State: Zustand stores for auth and vehicles. A real bug was found and fixed during manual testing: the vehicle
  store's `status` field was shared between per-screen refetches and root-navigator gating, which caused an
  infinite Splash↔Home bounce; fixed by adding a separate `hasLoadedOnce` flag for gating.
- Tests: **29 Jest tests** — phone/OTP validator unit tests, vehicle-form validation unit tests, a full
  `VehicleForm` component test (chip selection for vehicle/fuel type, rejecting an unrealistic mileage value,
  rejecting an invalid registration number), and a `LoginScreen` navigation-flow test (invalid-phone rejection,
  successful OTP-request navigation, server-error surfacing).
- Lint: `eslint-config-expo` via `npm run lint`, zero errors.

### Provider portal (`provider-web/`, React + Vite, JavaScript)

- Real email/password login against the backend, JWT refresh handling, role-gated dashboard (a signed-in
  customer or admin sees an honest "wrong portal" message instead of a broken screen).
- Profile display, logout with a confirmation dialog.
- Tests: **4 Vitest + Testing Library tests** covering all four role-gating outcomes (customer denied, admin
  denied, provider owner allowed, provider staff allowed).

### Admin portal (`admin-web/`, React + Vite, JavaScript)

- Same auth pattern, gated to `ADMIN`/`SUPER_ADMIN`.
- A **real** feature, not a placeholder: the dashboard calls the RBAC-protected `GET /api/v1/admin/users` and
  renders a paginated table with loading/empty/error states.
- Tests: **7 Vitest + Testing Library tests** — login validation/success/error paths, and all four role-gating
  outcomes (verified against a running backend during manual testing: a customer account is correctly blocked;
  the seeded admin account sees the live 6-user table).

## Verification performed

- `pytest -q` — 42/42 passing.
- `ruff check` — 0 errors (backend).
- `npm test` (mobile) — 29/29 Jest tests passing.
- `npm test` (admin-web) — 7/7 Vitest tests passing.
- `npm test` (provider-web) — 4/4 Vitest tests passing.
- `npm run lint` (mobile, provider-web, admin-web) — 0 errors (a few benign `set-state-in-effect`/fast-refresh
  style warnings remain in admin-web/provider-web, no errors).
- `npm run build` (provider-web, admin-web) — both build cleanly.
- Alembic migration applied to a fresh database and re-diffed with `--autogenerate` to confirm the models and
  the migration are in sync (after filtering out the `postgis_tiger_geocoder`/`postgis_topology` extension
  tables that the `postgis/postgis` Docker image ships, which autogenerate otherwise flags as "should be
  dropped" on every run).
- Manual `curl` smoke test of the full auth → profile → vehicle CRUD → admin-RBAC → refresh-rotation-reuse-
  detection flow against a running instance.
- Manual, live, end-to-end verification of **all three frontends** in the browser against the real backend and
  seeded data: mobile app (full Splash→Onboarding→Login→OTP→Location→Home→Explore→Profile→Add-vehicle flow,
  screenshotted at each step), admin portal (login, stale-session handling, real 6-row user table), provider
  portal (login as Provider Owner, real profile display, Phase-5 honesty note).

## Known limitations in what shipped

- Dev-only `npm audit` findings in `admin-web`/`provider-web`: `vitest`/`esbuild` dev-server path-traversal
  advisories. These affect the **local test runner only** (not runtime/production code, not `react`/`react-dom`)
  and fixing them requires a Vitest v5 major upgrade; deferred rather than risking a breaking change under this
  phase's time budget. Track before Phase 7's security pass.
- `react-native-svg`'s web renderer emits harmless `translateX`/`translateY` DOM-attribute console warnings when
  the mobile app runs via `expo start --web` (used here only for verification, not a shipping target) — the
  `Logo` component already uses the string `transform` form rather than the shorthand props to avoid this; any
  new SVG component should do the same.

## Not in scope for Phase 1 (by design)

Station discovery, live queue, worth-the-detour calculator (Phase 2); provider/service/booking/payment flows
(Phase 3–4); provider and admin portal features beyond login + the RBAC demo (Phase 5); expenses, reminders,
push notifications, weather warnings, reviews/disputes (Phase 6); broader test/perf/security/accessibility pass
and deployment prep (Phase 7). See the root README's phase table and `RISKS_AND_PENDING_INTEGRATIONS.md`.
