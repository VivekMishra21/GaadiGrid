# Phase 3 Completion Report

Scope, per the agreed implementation plan: providers, services, packages, slots, the booking state machine, and
customer booking screens — implemented as working vertical slices across the backend, mobile app, and provider
portal.

## Definition of done, checked against what shipped

For every feature below: UI implemented, backend endpoint implemented, database persistence works, authentication
and authorization are enforced server-side, loading/empty/error states work, validation works on client and
server, relevant automated tests pass, no secrets are committed, no placeholder action remains.

### Backend (`backend/`)

| Area | What's there |
|---|---|
| Schema | New Alembic migration `e893787b0cb6_phase3_providers_services_bookings` adds `providers`, `provider_availability`, `service_packages`, `bookings` |
| Providers | `Provider` — one per `PROVIDER_OWNER` (self-service creation, enforced by a unique constraint on `owner_user_id`), business details, `is_verified` (admin-controlled, doesn't gate bookings — no verification UI exists yet, so gating on it would make nothing bookable), soft-delete + `is_active` |
| Provider search | `GET /api/v1/providers` — city/text/category filters, pagination (no geo-radius search for providers this phase — kept in scope with what was asked; stations already have that pattern in Phase 2 if wanted later) |
| Service packages | `ServicePackage` — category, name, price, duration, `is_doorstep`; no hard-delete endpoint (deactivate only — past bookings hold a price/duration snapshot and a FK to the package row) |
| Availability | `ProviderAvailability` — one row per open weekday (Mon=0..Sun=6) with opens/closes times; a day with no row is closed. Replace-the-whole-week upsert pattern, same as Phase 2's station facilities |
| Slot computation | `app/services/slot_service.py::compute_available_slots` — **pure, deterministic, DB-free function**: given a day's opening window, a package duration, and the day's existing non-terminal bookings, generates back-to-back candidate slots and excludes any that overlap an existing booking or fall at/before "now" |
| Booking state machine | `app/services/booking_state_machine.py` — pure `can_transition(current, new, actor)` function over an explicit transition table: `PENDING → CONFIRMED/REJECTED/CANCELLED`, `CONFIRMED → IN_PROGRESS/CANCELLED`, `IN_PROGRESS → COMPLETED`; `COMPLETED`/`CANCELLED`/`REJECTED` are terminal. Only the provider can confirm/reject/start/complete; either party can cancel before service starts |
| Booking creation | `app/services/booking_service.py::create_booking` — validates the package/provider are active, a doorstep package has an address, the vehicle belongs to the customer, the requested slot isn't in the past, and the slot is actually in the currently-computed available set (re-checked server-side at creation time, not trusted from the client) — a genuine double-booking is rejected with 409, verified live |
| Timezone correctness | `app/core/timezone.py::IST` — a real bug was found and fixed during live browser verification: provider hours ("9:00") were being labelled UTC instead of converted from IST, so customers saw booking times shifted by 5.5 hours (e.g. a 9am slot showing as 2:30pm). Fixed at the service/repository boundary; `slot_service.py` itself stays timezone-agnostic (pure naive-time arithmetic), with the IST↔UTC conversion applied only where real-world instants meet the wall-clock hours a provider configured |
| Routers | `app/routers/providers.py` (search, CRUD, availability, packages, available-slots) and `app/routers/bookings.py` (create, list mine/provider, confirm/reject/start/complete/cancel) |
| Tests | **51 new pytest tests** (142 total, up from 93): the slot computation algorithm (back-to-back generation, closing-time boundary, zero/negative duration, overlap exclusion including exact-boundary non-overlap, past-time exclusion, multiple bookings), the state machine (every valid transition per actor, every invalid transition and role rejected, terminal states verified to have zero further transitions), and the full API surface (provider self-service creation and the one-provider-per-owner constraint, ownership enforcement on updates, public search filters, package CRUD and category/price validation, availability validation, the full booking happy path PENDING→CONFIRMED→IN_PROGRESS→COMPLETED, reject-with-reason, cancel-with-reason, RBAC on every action, double-booking rejection, doorstep-requires-address, vehicle-ownership enforcement, booking-outside-availability rejection) |
| Dev seed data | `app/workers/seed.py` extended with one example provider ("Sparkle Auto Care", owned by the seeded `PROVIDER_OWNER` account) with 3 service packages (car wash, detailing, AC service — mixing doorstep and visit-provider) and Mon–Sat 9am–7pm availability |

### Mobile app (`mobile/`)

- **Services tab** (`ServicesScreen`) replaces the Phase 1/2 "coming soon" placeholder: real provider search backed
  by the API, text search, category filter chips.
- **Provider detail** (`ProviderDetailScreen`): business info, real package list with price/duration/doorstep
  indicator, tapping a package starts the booking flow.
- **Booking flow** (`BookingScreen`): pick a date (next 14 days), fetch and pick a real available time slot, pick
  a vehicle (from the existing vehicle store), pick or add a delivery address inline (doorstep packages only —
  addresses didn't have any mobile UI before this phase, so a minimal inline add-address form was built alongside
  the booking flow rather than a full separate address-management screen, to keep scope matched to what's needed),
  optional notes, then submits a real booking. A confirmation screen follows, and "View my bookings" jumps to the
  new **Bookings tab** (`BookingsScreen`), which lists the customer's real bookings with live status and lets them
  cancel a `PENDING`/`CONFIRMED` booking.
- No new pure-logic unit needed a Jest test this phase (unlike Phase 2's detour calculator) — the booking domain
  logic (the state machine, slot computation) lives server-side by design, since slot availability must be
  re-validated against the database at booking time regardless of what the client computed.

### Provider portal (`provider-web/`)

- Replaced the Phase 1 single "Business tools are coming in Phase 5" placeholder with a real sidebar shell and
  three working sections — this is a genuine change from what Phase 1 shipped, not a Phase 5 pull-forward: a
  provider needs *some* way to list services and respond to bookings for the booking flow to be demonstrable at
  all, the same reasoning that gave admin-web a Stations page in Phase 2 despite Phase 2's scope line not naming
  it. Full business tools (verification workflow, staff management, earnings/analytics) remain Phase 5 and are
  still called out as such on the Settings tab.
  - **My Business**: create-your-business-profile flow for a `PROVIDER_OWNER` with none yet, then tabbed
    Details/Packages/Working hours management for their own provider.
  - **Bookings**: real incoming bookings with status badges and the state-machine actions appropriate to each
    status (Confirm/Reject when pending, Start/Cancel when confirmed, Mark completed when in progress).
  - **Settings**: unchanged profile display + sign-out, with the Phase 5 note narrowed to what's actually still
    missing.

## Verification performed

- `pytest -q` (backend) — **142/142 passing** (51 new Phase 3 tests + all 93 Phase 1/2 tests still passing).
- `ruff check app tests` (backend) — 0 errors.
- `npm test` (mobile) — 41/41 Jest tests passing (unchanged count — see note above on why no new tests were
  needed), `npm run lint` — 0 errors.
- `npm test` (provider-web) — 5/5 Vitest tests passing (one new test added, one updated to match the new default
  landing page), lint clean (only pre-existing warnings in files this phase didn't touch).
- Alembic migration applied to the dev database and re-diffed with `--autogenerate` to confirm the models and
  migration are in sync.
- Manual `curl` smoke test of the full booking lifecycle before the timezone bug was found and fixed.
- **Live, end-to-end browser verification** against the real backend and seeded data, across *both* frontends in
  the same session so the shared backend state could be watched propagate between them:
  - Mobile: logged in as the seeded customer, browsed Services, opened Sparkle Auto Care, booked "Interior Deep
    Clean" (a doorstep package) — picked a real date and time slot, picked the seeded vehicle and address, and
    submitted. This is where the timezone bug was caught (slots displayed as 2:30pm–10:30pm instead of the
    provider's actual configured 9am–7pm hours) and fixed live, then re-verified correct (9am, 11am, 1pm, 3pm,
    5pm — matching 9am–7pm in 120-minute steps).
  - Provider portal: logged in as the seeded provider owner, saw the new booking land as `PENDING`, clicked
    Confirm, Start service, and Mark completed through the real UI (not curl) — each transition using the actual
    state-machine-backed API.
  - Mobile again: refreshed the Bookings tab and confirmed the same booking now shows `Completed`, proving both
    frontends are reading consistent, shared backend state rather than separately-mocked data.

## Known limitations in what shipped

- **The timezone fix is app-wide-single-locale (IST), not per-provider or per-user.** This mirrors the same
  simplification already accepted for `FuelStation.opens_at`/`closes_at` in Phase 2 — there is still no timezone
  field anywhere in the schema. `app/core/timezone.py` is the one place this assumption is now named, so a future
  multi-region phase has a single spot to generalize from, rather than the conversion being scattered.
  Consequently, the encountered-and-fixed 5.5-hour display bug is a good example of why this class of bug is easy
  to introduce with a real-instant-vs-wall-clock mismatch — worth a deliberate test if this assumption is ever
  lifted.
- No geo-radius "providers near me" search this phase (unlike Phase 2's stations) — city/text/category filters
  only. `Provider.latitude`/`longitude` are stored (and shown on the summary), so adding PostGIS-backed distance
  search later is additive, not a schema change.
- No automated tests were added for the provider-web Business/Bookings pages beyond the updated role-gating test
  — consistent with the same scope decision made for admin-web's Stations page in Phase 2, and verified instead
  by the live end-to-end browser pass described above.
- A couple of `net::ERR_EMPTY_RESPONSE` connection blips were observed against the local single-process `uvicorn`
  dev server during the live verification session (once right after a manual server restart, once during normal
  use); both resolved on an immediate retry with no server-side error logged. This looks like a local dev-server
  connection-handling quirk, not an application bug — nothing in the backend logs indicated a crash or exception
  at those moments — but it's noted here for the session record rather than silently ignored.
- Mobile's inline "add address" form inside the booking flow is intentionally minimal (label, line1, city, state,
  pincode) — there is still no dedicated address-management screen in the Profile tab. Addresses created this way
  are fully real and usable (same backend endpoint Phase 1 already had), just not editable/deletable from the
  mobile UI yet.

## Not in scope for Phase 3 (by design)

Payment orders, webhook verification, refunds, commission/settlement records (Phase 4); full provider business
tools — verification workflow, staff management, earnings/analytics — and admin moderation tools (Phase 5);
expenses, reminders, notifications, weather warnings, reviews/disputes (Phase 6); broader test/perf/security/
accessibility pass and deployment prep (Phase 7). See the root README's phase table and
`RISKS_AND_PENDING_INTEGRATIONS.md`.
