# Phase 5 Completion Report

Scope, per the agreed implementation plan: provider portal and admin portal — verification, moderation, full
business tools — implemented as working vertical slices across the backend, provider portal, and admin portal.

## Definition of done, checked against what shipped

For every feature below: UI implemented, backend endpoint implemented, database persistence works, authentication
and authorization are enforced server-side, loading/empty/error states work, validation works on client and
server, relevant automated tests pass, no secrets are committed, no placeholder action remains.

### Backend (`backend/`)

| Area | What's there |
|---|---|
| Schema | New Alembic migration `4a077507981d_phase5_provider_verification_staff` adds `provider_staff_members` and replaces `providers.is_verified` with `verification_status`, `business_registration_number`, `gst_number`, `verification_notes`, `verification_submitted_at`, `verified_at` (the new `NOT NULL` column carries a `server_default` so it applies cleanly to the already-populated dev table) |
| Verification state machine | `app/services/provider_verification.py` — a **pure, DB-free** state machine (mirrors Phase 3's booking state machine): `UNVERIFIED → PENDING` (owner submits), `PENDING → VERIFIED` / `PENDING → REJECTED` (admin decides), `REJECTED → PENDING` (owner resubmits). `provider_verification_service.py` wraps it with the DB update |
| Staff linkage | `ProviderStaffMember(provider_id, user_id)` with a **unique constraint on `user_id`** — a `PROVIDER_STAFF` account (creatable only via admin/seed, no public signup) can be linked to at most one business at a time. `provider_staff_repository.py` handles add/remove/list/lookup |
| Unified manager check | `provider_repository.is_manager(db, provider, user)` — true for an admin, the provider's owner, or a linked staff member. This single helper now backs authorization in `providers.py`, `bookings.py`, and `payments.py`, replacing three separately-duplicated owner-only checks — closing a real gap where `PROVIDER_STAFF` accounts (a role that's existed since Phase 1) had **zero** ability to act on their employer's bookings, packages, or availability |
| Provider endpoints | `POST /providers/{id}/verification/submit` (owner-only, not staff/admin), `GET/POST /providers/{id}/staff`, `DELETE /providers/{id}/staff/{user_id}` (manager-or-admin) |
| Admin endpoints | `GET /admin/users` (now filterable by `role`/`q`/`is_active`), `POST /admin/users/{id}/deactivate`/`reactivate`, `GET /admin/providers` (all providers including inactive/unverified, filterable by `verification_status`/`q`), `POST /admin/providers/{id}/verify`/`reject`/`deactivate`/`reactivate` |
| Self-lockout protection | An admin cannot deactivate their own account or another admin/super-admin account (`ForbiddenError`) — deactivation is only possible for `CUSTOMER`, `PROVIDER_OWNER`, `PROVIDER_STAFF` |
| Audit trail | Every admin-sensitive action (verify, reject, deactivate, reactivate — for both users and providers) calls the existing `record_audit_event` |
| Tests | **31 new pytest tests** (201 total, up from 170): 10 pure state-machine tests covering every legal/illegal transition and actor combination, and 21 API-level tests covering the full verification lifecycle (submit, owner-only, no double-submit, approve, reject with reason, resubmit after rejection, non-admin denied), admin provider/user listing and filtering, user and provider deactivate/reactivate (including the self-lockout and admin-lockout cases and that a deactivated provider drops out of public search), and staff management (add/list/remove, rejecting a non-staff-role user, rejecting a user already linked elsewhere, and — the key regression check — a linked staff member successfully managing their employer's bookings while being blocked from a different provider's) |

### Provider portal (`provider-web/`)

- **My Business → Verification tab**: shows current status (`Not submitted` / `Pending review` / `Verified` /
  `Rejected`) with a submission form (business registration number, optional GST number) for the unverified/
  rejected states, the rejection reason for a rejected submission, and a verified badge with date once approved.
- **My Business → Staff tab**: lists current staff (name, email) with a remove action, and an "add staff by
  email" form with a hint that the account must already exist with the Provider Staff role.
- Fixed a real bug introduced by the schema change: the page header used to read the now-removed `is_verified`
  field; it now reads `verification_status` through the same `VERIFICATION_LABELS` map used on the Verification
  tab.
- Settings page's stale "More business tools are coming in Phase 5" placeholder replaced with a pointer to the
  now-live My Business tabs.

### Admin portal (`admin-web/`)

- **New Providers page**: all providers (including inactive/unverified), filterable by verification status and
  searchable by business name/city, showing the submitted registration/GST numbers and the rejection reason
  inline when rejected. Verify / Reject (with a reason modal) actions appear only while `PENDING`; Deactivate/
  Reactivate is always available.
- **Dashboard (user list) extended**: role and search filters, an Active/Inactive status column, and a
  Deactivate/Reactivate action per row — hidden for admin/super-admin rows and for the signed-in admin's own row,
  matching the backend's lockout rules exactly (the UI never offers an action the backend would reject).

## Verification performed

- `pytest -q` (backend) — **201/201 passing** (31 new Phase 5 tests + all 170 Phase 1–4 tests still passing).
- `ruff check app tests` (backend) — 0 errors.
- `alembic check` — no drift between models and migrations after applying the new migration to the dev database.
- `npx oxlint src` (provider-web, admin-web) — 0 errors (only the same pre-existing warning patterns already
  present in files this phase didn't touch).
- `npx vitest run` (provider-web) — 5/5 passing, including an updated test for the Settings-tab copy change.
- `npx vitest run` (admin-web) — 14/14 passing (7 pre-existing + 7 new: ProvidersPage list/verify/reject/
  deactivate, DashboardPage list/deactivate/self-hidden).
- **Live, end-to-end browser verification across the provider and admin portals in the same session**: submitted
  a business registration + GST number as the seeded provider owner → admin portal correctly showed it `PENDING`
  → verified it as admin → provider portal immediately showed "Verified business" → reset to `PENDING` and
  rejected it with a reason as admin → provider portal showed the rejection reason and a pre-filled resubmit form
  → resubmitted → re-verified → deactivated and reactivated both a customer user and the provider itself as
  admin, confirming via direct API checks that a deactivated provider drops out of public search and a
  deactivated user is denied at `/auth/me` → signed in as the seeded, already-linked `PROVIDER_STAFF` account and
  confirmed **My Business** resolves to the owner's business (via `get_by_owner_or_staff`) and **Bookings**
  correctly lists the employer's bookings (via the unified `is_manager` check) — the core Phase 5 authorization
  fix, working live.

## Known limitations in what shipped

- **No document upload for verification.** Submission is business registration number + optional GST number as
  text fields, not a scanned certificate/document. Real document upload needs object storage (S3 or equivalent),
  which is an explicit, separate Phase 5 dependency in `docs/RISKS_AND_PENDING_INTEGRATIONS.md` and wasn't pulled
  into this phase to avoid scope creep into a new storage-adapter subsystem.
- **No real KYC/registry check.** A submitted registration number is not verified against any government
  registry — approval is a human admin decision based on what's submitted, same as most marketplaces at this
  stage.
- **Staff accounts still can't self-register.** A `PROVIDER_STAFF` account can only be created by an admin (or
  the dev seed), matching the Phase 1 design; this phase adds the ability to *link* an existing staff account to
  a business, not a self-serve invite/signup flow. A full invite-by-email flow (creating the account too) would
  be a proportionate but separate addition if needed later.
- **A provider can have exactly one linked staff member's worth of employer at a time** (the unique constraint is
  on `user_id`, not `(provider_id, user_id)`) — a staff account cannot be linked to two providers simultaneously.
  This matches how the seed data and every real scenario considered here actually works; revisit only if a
  multi-employer use case appears.
- Admin's Reject-with-reason and Deactivate/Reactivate actions on the Providers page don't use a native
  `confirm()` for deactivate/reactivate (unlike Stations' delete), consistent with those being reversible,
  low-risk actions; Reject correctly does require a reason via a proper modal since it's a more consequential,
  provider-facing decision.

## Not in scope for Phase 5 (by design)

Expenses, reminders, notifications, weather warnings, reviews/disputes (Phase 6); broader test/perf/security/
accessibility pass and deployment prep, including document-upload storage and real payout/banking integration if
still desired at that point (Phase 7). See the root README's phase table and
`RISKS_AND_PENDING_INTEGRATIONS.md`.
