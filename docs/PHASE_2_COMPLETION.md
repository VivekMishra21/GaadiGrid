# Phase 2 Completion Report

Scope, per the agreed implementation plan: station map/list, fuel prices, station details, queue reporting, queue
freshness/trust logic, and the worth-the-detour calculator — implemented as working vertical slices across the
backend, mobile app, and admin portal.

## Definition of done, checked against what shipped

For every feature below: UI implemented, backend endpoint implemented, database persistence works, authentication
and authorization are enforced server-side, loading/empty/error states work, validation works on client and
server, relevant automated tests pass, no secrets are committed, no placeholder action remains.

### Backend (`backend/`)

| Area | What's there |
|---|---|
| Schema | New Alembic migration `dfa8b6ea5629_phase2_stations_fuel_queue` adds `fuel_stations` (PostGIS `Geography(POINT, 4326)` + GIST index), `fuel_types`, `fuel_prices`, `fuel_availability`, `station_facilities`, `queue_reports`, `queue_report_flags`, `favorite_stations` |
| Geo search | `GET /api/v1/stations` — optional `lat`/`lng`/`radius_km` (PostGIS `ST_DWithin`/`ST_Distance`, nearest-first ordering, defaults to a 10km radius, capped at 50km), `city`/`q`/`fuel_type` filters, pagination |
| Station detail | `GET /api/v1/stations/{id}` — full price table, facilities, official availability, live combined queue/CNG status, favorite state for the requesting user (auth optional) |
| Admin station management | `POST/PUT/DELETE /api/v1/stations`, `PUT /{id}/prices`, `PUT /{id}/availability`, `PUT /{id}/facilities` — all `ADMIN`/`SUPER_ADMIN`-only, enforced server-side |
| Fuel prices | Current-price-only model (no history table — `updated_at` + `age_minutes` in every response is what keeps a stale price from being shown as current, rather than an append-only log) |
| Favorites | `POST /{id}/favorite` (toggle), `GET /favorites/mine` |
| Queue reporting | `POST /api/v1/stations/{id}/queue-reports` — Redis-backed per-user-per-station cooldown (`queue_report_cooldown_seconds`, default 120s), haversine distance check against `queue_report_max_distance_km` (default 2km) rejects reports from users who aren't actually near the station, provider-role reporters are automatically flagged `is_verified_partner_report` |
| Queue combination algorithm | `app/services/queue_status_service.py::combine_reports` — **pure, deterministic, DB-free function**: filters expired (`queue_report_expire_minutes`, default 45min) and over-flagged (`queue_report_flag_threshold`, default 2) reports, then computes a recency-decayed, trust-weighted (verified partner reports weighted `queue_report_verified_partner_weight`×, default 3.0) average, separately for queue-length and CNG-pressure signals; confidence score capped at 1.0. `get_station_queue_status` is the thin DB-facing wrapper that gathers rows and calls it |
| Flagging | `POST /api/v1/queue-reports/{id}/flag` — rejects self-flagging and duplicate flags; a report hitting the flag threshold is automatically excluded from the combined status (verified live: flagging a report by two different users makes it disappear from `queue_status` on the next fetch) |
| Reference data | `app/workers/reference_data.py::ensure_fuel_types` — idempotent PETROL/DIESEL/CNG/EV catalog seeding, runs on every app startup including production (this is fixed reference data the schema depends on by foreign key, not sample data) |
| Dev seed data | `app/workers/seed.py` extended with 6 example Noida stations (realistic brand/locality names, prices, facilities, availability) and sample queue reports — including one **deliberately backdated past the expiry window** to demonstrate that stale reports drop out of the live status instead of being shown as current |
| Tests | **51 new pytest tests** (93 total, up from 42): the combination algorithm (empty/single/multi-report, verified-partner weighting, expiry, flagging, decay, confidence capping, independent queue/CNG groups), `haversine_km` unit tests, geo search (radius filtering, distance ordering, city/text/fuel-type filters), full station CRUD + admin-only enforcement, price/availability/facility upsert + validation, favorites toggle, queue-report submission (verified-flag correctness, distance rejection, cooldown, per-station-independent cooldown), flagging (self-flag/duplicate-flag rejection, threshold exclusion) |

### Mobile app (`mobile/`)

- **Explore tab** (`ExploreScreen`) replaces the Phase 1 "coming soon" placeholder: real station list backed by
  the search API, text search (name/locality/city), fuel-type filter chips, pull-to-refresh. Requests device
  location via `expo-location` for distance-sorted results; when permission is denied, shows an honest inline
  message ("results aren't sorted by distance") and falls back to text search — no fake or broken map, per the
  project's dev-adapter honesty pattern (no maps API key is configured yet — see the risks doc).
- **Station detail** (`StationDetailScreen`): full price table, facilities, opening hours, live queue/CNG status
  with age and report count, favorite toggle, a "Navigate here" button that opens the device's installed maps
  app via a plain `https://www.google.com/maps/dir/...` URL (no API key needed), and an inline queue/CNG report
  submission form (chip-based, reuses the existing `ChipGroup` component) that also attempts to attach the
  device's current location for server-side distance verification.
- **Worth-the-detour calculator** (`DetourCalculatorScreen` + `src/utils/detourCalculator.js`): a pure,
  deterministic client-side function — compares the price savings of filling up at a farther/cheaper station
  against the extra round-trip fuel cost of the detour, including a break-even fill amount. Pre-fills the
  detour price from the station just viewed and the user's real vehicle mileage when available. **12 Jest
  tests** covering worth-it/not-worth-it/break-even cases, zero-distance, more-expensive-detour, deterministic
  output, and validation of every input field.
- Navigation: `Explore` tab is now a stack (`ExploreList → StationDetail → DetourCalculator`).

### Admin portal (`admin-web/`)

- New **Stations** page: paginated table of all stations with search, a create/edit modal with tabbed Details/
  Prices/Facilities sections (Prices and Facilities unlock once the station exists), and delete with
  confirmation. All calls go through the existing RBAC-protected admin station endpoints.

## Verification performed

- `pytest -q` (backend) — **93/93 passing** (51 new Phase 2 tests + all 42 Phase 1 tests still passing).
- `ruff check app tests` (backend) — 0 errors.
- `npm test` (mobile) — **41/41 Jest tests passing** (12 new detour-calculator tests + all 29 Phase 1 tests).
- `npm run lint` (mobile) — 0 errors.
- `npm test` (admin-web) — 7/7 Vitest tests passing (unchanged from Phase 1; no new automated tests were added
  for the Stations page itself — see Known limitations).
- `npx oxlint` (admin-web) — 0 errors (one pre-existing `set-state-in-effect` warning pattern, identical to the
  one already present in `DashboardPage.jsx`).
- Alembic migration applied to the dev database and re-diffed with `--autogenerate` to confirm the models and
  migration are in sync.
- Manual `curl` smoke test of the full station lifecycle: search (city/text/fuel-type/geo-radius filters,
  distance ordering), station detail, admin create/update/delete, price/availability/facility upserts, favorite
  toggle, admin-only enforcement (401 unauthenticated, 403 wrong role), queue-report submission (distance
  rejection, cooldown rejection), flagging.
- **Live, end-to-end browser verification** against the real backend and seeded data:
  - Mobile (web preview): full login → Explore (real seeded stations, prices, honest no-location-permission
    state) → Station detail (real price table, facilities, live status) → submitted a live queue report and
    watched the status update in real time → worth-the-detour calculator (pre-filled from the station and the
    user's real vehicle, calculated and displayed correct net savings and break-even).
  - Admin portal: Stations page loading real seeded data, created a test station end-to-end (details → prices →
    facilities, each save confirmed), then cleaned it up.

## Known limitations in what shipped

- No automated tests were added for the admin-web Stations page or its create/edit modal — Phase 1's admin-web
  test coverage was already sparse (login + role-gating only), and this phase's testing effort was concentrated
  on the backend algorithm and API surface plus the mobile calculator, per the emphasis in the Phase 2 kickoff
  instruction ("station map/list, fuel prices, queue reporting"). The feature was verified manually end-to-end
  in the browser instead. Consider adding component tests before Phase 7's test pass.
- The mobile Explore screen is list-only, not an embedded interactive map — no maps API key is configured yet
  (see `RISKS_AND_PENDING_INTEGRATIONS.md`). "Navigate here" opens the device's own maps app instead, which
  needs no API key and works today; an embedded map view is deferred until a real key is available, rather than
  shipping a broken or fake map.
- Fuel prices are current-value-only (no price history table), which was a deliberate scope decision for this
  phase, not an oversight — see the code comment on `FuelPrice`. A history table can be added later without
  breaking the existing schema if trend charts are wanted.
- During this phase's work, a local Docker Desktop process on the development machine was inadvertently killed
  while investigating an unrelated port conflict, which temporarily took down this project's own Postgres/Redis
  containers until Docker Desktop was restarted. Not a code or data issue — noted here only for the session
  record; no repository state was affected and all data (including the dev seed) survived because Docker
  volumes are independent of container lifecycle.

## Not in scope for Phase 2 (by design)

Provider/service/booking/payment flows (Phase 3–4); provider and admin portal features beyond login + the RBAC
demo + station management (Phase 5); expenses, reminders, push notifications, weather warnings, reviews/disputes
(Phase 6); broader test/perf/security/accessibility pass and deployment prep (Phase 7). See the root README's
phase table and `RISKS_AND_PENDING_INTEGRATIONS.md`.
