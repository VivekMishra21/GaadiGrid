# Phase 7 Completion Report

Scope, per the agreed implementation plan: automated tests, performance, security review, accessibility,
deployment prep. Unlike Phases 1–6, this phase didn't add product features — it audited and hardened what
Phases 1–6 built. Two independent full-codebase audits (security, performance) were run, and every finding that
was fixable without a live production environment was fixed and verified.

## Security review

A full-codebase security audit covered auth/session handling, authorization (IDOR risk across every router),
input validation/injection, secrets/CORS/security-headers configuration, rate limiting, dependency risk, mobile
token storage, and audit-log coverage. Findings and fixes:

| Finding | Severity | Fix |
|---|---|---|
| admin-web/provider-web stored the 30-day refresh token in `localStorage`, readable by any JS on the page (i.e. any future XSS) | Medium | Moved the refresh token into an `httpOnly`, `Secure`-in-production, `SameSite=Lax` cookie the backend sets and clears (`backend/app/routers/auth.py`); both portals now hold only the 15-min access token client-side. `POST /auth/logout` on the web portals now actually calls the backend (it never did before — a genuine pre-existing gap this surfaced), so signing out for real revokes the session instead of just clearing local state. |
| `/auth/refresh` had no rate limiting, unlike every other auth endpoint | Medium | Added the same `rate_limit` dependency (30/min) the other auth routes already use. |
| The payment webhook endpoint had no rate limiting | Medium | Added rate limiting (120/min) as defense-in-depth; signature verification already correctly gates any state change. |
| Admin station-management endpoints (create/update/delete/prices/availability/facilities) were the one place in the codebase that skipped `record_audit_event` | Medium | All six now log, matching every other admin-sensitive mutation. |
| `/auth/staff-login` leaked whether an email exists via response timing (bcrypt only ran for a real account) | Low | Always runs a bcrypt verify against a fixed dummy hash when no such user exists, so both paths take equivalent time. |
| No CSP or HSTS anywhere in the stack | Low | Backend sends a CSP (scoped to allow only Swagger UI's own CDN assets) and HSTS (production-only). Both frontend nginx configs now send CSP/`X-Frame-Options`/etc. too. |
| Any linked `PROVIDER_STAFF` account could add or remove *other* staff, not just the owner | Low | Staff-management endpoints now require the owner or an admin; staff can still view the staff list. |
| `OtpVerifyIn.full_name` / `DeleteAccountIn.reason` had no `max_length`, unlike every other free-text field | Info | Added, matching the rest of the schema layer. |

Also fixed along the way, found during deployment prep rather than the audit itself: `admin-web`'s and
`provider-web`'s `package-lock.json` had drifted out of sync with `package.json` (an `esbuild`/`vite` version
mismatch), which meant `npm ci` — the exact command the existing CI pipeline runs — **was silently broken** in
both apps. Fixing it also resolved the `vitest`/`esbuild` dev-tooling vulnerabilities already flagged in the
risks doc (`vitest` 2.1.8 → 5.0.1 in both; `npm audit` now reports 0 vulnerabilities in both, down from 5
including one critical).

**7 new backend tests** cover the auth changes specifically (cookie is set on login, refresh works from the
cookie alone with no body token, refresh is rejected with neither, refresh is rate-limited, logout clears the
cookie and genuinely revokes the token server-side), the station audit-logging fix, and the staff-management
privilege restriction.

Not fixed, and why: `python-jose` (the JWT library) is old and effectively unmaintained upstream, but
`decode_token` always passes an explicit `algorithms=["HS256"]` allowlist, so the historical algorithm-confusion
class of advisory doesn't apply here — tracked as a forward-looking maintenance item in the risks doc, not an
active vulnerability. Items needing a real production environment to act on (rotating `JWT_SECRET_KEY`,
restricting CORS to real domains, TLS termination) are listed in `docs/RISKS_AND_PENDING_INTEGRATIONS.md`.

## Performance review

A second full-codebase audit checked for N+1 query patterns, missing indexes, unbounded (non-paginated) list
endpoints, redundant queries within a request, and the PostGIS geo-search query shape. Fixes:

- **Admin providers list** (`GET /admin/providers`) had the exact N+1 that `GET /providers` (public search) had
  already been fixed for in an earlier phase, just not applied here — up to 200 extra queries at `page_size=100`
  (one rating query and one packages query per provider). `build_provider_manager_details()`
  (`app/routers/providers.py`) now batches both, backed by new `review_repository.get_ratings_for_providers`
  (already existed) and `service_package_repository.list_for_providers` (new).
- **Favorites list** (`GET /stations/favorites`, `list_my_favorites`) fetched each favorited station with a
  separate `get_by_id` call in a loop. New `station_repository.list_by_ids` does it in one `WHERE id IN (...)`
  query.
- **Expense summary** (`GET /vehicles/{id}/expenses/summary`) loaded *every* expense row for the vehicle and
  summed them in Python — the one genuinely unbounded-over-time list in the app (years of fuel/service/fine
  entries). New `expense_repository.sum_by_category_for_vehicle` does the aggregation in SQL (`GROUP BY
  category`) instead, so the result size no longer grows with history length.
- **Missing indexes on `notifications`**: `list_for_user` and `unread_count`/`unread_only` both filter by
  `user_id` and then sort/filter by `created_at`/`read_at`, neither of which was indexed. New composite indexes
  `(user_id, created_at)` and `(user_id, read_at)` (migration `262ba4479d09`).

Confirmed already solid: pagination is used correctly everywhere it matters; every foreign key has an index;
every status/verification column used in a `WHERE` clause is indexed; the PostGIS distance query is
textbook-correct (`ST_DWithin` as a filter, `ST_Distance` only for `ORDER BY`, in both the count and data
queries).

Identified but **not** fixed this phase, documented as known follow-ups rather than rushed: a similar N+1 in
station search's queue-status lookup (`_build_summary` calls `get_station_queue_status` once per station in the
results), and in booking list responses (`_to_out` fetches provider/package/payment-order per booking) — both
would need a new batching helper threaded through code that's already been live-verified extensively across
three phases, and the risk of touching it outweighed the benefit at current data volumes. Revisit if either
endpoint's response time becomes a real problem.

## Accessibility

A targeted pass rather than an exhaustive retrofit, focused on the highest-value gaps:

- **Mobile**: `TextField` (used by nearly every form in the app) now sets `accessibilityLabel` from its visible
  label/placeholder automatically, so every field that uses it benefited without touching each screen
  individually. The two icon-only controls with no other fix (the Home tab's notification bell, the star-rating
  input on the new Review screen) now have explicit `accessibilityRole`/`accessibilityLabel`/`accessibilityState`.
- **Web** (admin-web): the three search inputs that relied on `placeholder` alone (Dashboard, Providers, Stations
  pages) now have an `aria-label` matching their purpose.

Not attempted: a full retrofit of every `TouchableOpacity`/icon across ~25 mobile screens, or converting every
sibling `<label>`/`<input>` pair in admin-web/provider-web forms to a programmatically-associated pattern (most
already use the nested-label pattern from Phase 1's `LoginPage`; a few in Phase 5/6's newer forms don't). Both
are real, valid follow-up work — flagged here rather than attempted under this phase's remaining time budget,
consistent with every other phase's documented scope boundaries.

## Deployment prep

- **New Dockerfiles**: `admin-web/Dockerfile` and `provider-web/Dockerfile` (multi-stage: `npm run build` →
  nginx static serve, mirroring the existing `backend/Dockerfile` pattern), each with an `nginx.conf` that sends
  baseline security headers and serves the SPA correctly (hashed assets cached for a year, `index.html` never
  cached). `backend/Dockerfile` already existed from an earlier phase.
- **New `.dockerignore` files** for all three (backend, admin-web, provider-web) — added after discovering the
  backend one's absence meant `COPY . .` would have baked the local `.env` (with dev secrets), the entire `venv/`,
  and a stray leftover `gaadigrid.db` file into the image. Verified by actually building the image and confirming
  none of those three end up in it.
- **CI now builds every Docker image** (`.github/workflows/ci.yml`) as its own step per app, specifically so a
  broken lock file or a Dockerfile regression (like the one just described) fails CI immediately instead of
  going unnoticed until someone tries to deploy — which is exactly the class of bug the lock-file fix above was.
- **New `docs/DEPLOYMENT.md`**: how each service is built/served, the `VITE_API_BASE_URL` build-arg requirement,
  the production migration process, and the cookie/CORS implications of this phase's auth change (the refresh
  cookie requires real HTTPS in production or the browser silently won't store it).

## Verification performed

- `pytest -q` (backend) — **263/263 passing** (7 new Phase 7 tests + all 256 Phase 1–6 tests still passing).
- `ruff check app tests` (backend) — 0 errors.
- `alembic check` — no drift after applying the notification-indexes migration.
- `npm audit` (admin-web, provider-web) — 0 vulnerabilities (down from 5, including 1 critical).
- `npx vitest run` (admin-web) — 14/14 passing on the upgraded vitest. (provider-web) — 5/5 passing.
- `npm run build` (admin-web, provider-web) — both still build cleanly on the upgraded toolchain.
- `npm run lint` / `npm test` (mobile) — 0 errors, 41/41 passing, after the accessibility changes.
- `docker build` — all three app images (backend, admin-web, provider-web) build successfully; each was actually
  run and its root page/API doc curled to confirm it serves, not just that the build step exits 0.
- **Live, end-to-end browser verification of the new cookie-based auth flow** on both admin-web and provider-web:
  confirmed via `document.cookie` that the refresh token is genuinely invisible to page JS after login (httpOnly
  working), confirmed the `Set-Cookie` response header's exact attributes via curl (`HttpOnly; Max-Age=2592000;
  Path=/api/v1/auth; SameSite=lax`), exercised a cross-origin cookie-based refresh call directly from the
  browser console, and confirmed sign-out both clears the cookie client-side and genuinely revokes the token
  server-side (a subsequent refresh attempt with the old token correctly returns
  `refresh_token_reuse_detected`/expired rather than succeeding).

## Not in scope for Phase 7 (by design)

Load testing under real concurrency, a full WCAG-level accessibility audit (automated + manual screen-reader
testing) across every screen, migrating off `python-jose`, and the production-environment-dependent items in
`docs/RISKS_AND_PENDING_INTEGRATIONS.md` (JWT secret rotation, CORS origin restriction, TLS termination, a real
SMS/payment provider). This is the last phase in the plan — see the root README's phase table — so anything
listed as a known follow-up here or in the risks doc is the actual, final state of what's left before this
repository could be called production-ready.
