# Legacy Phase 0 code

This is the original SQLite-backed prototype (users with email/password auth, simple `stations`,
`providers`, `services`, `bookings`, `payments` tables) built before the full production spec was
adopted. It is **not imported by `app/main.py`** and does not run.

It's kept here for reference only — several field names and ideas (e.g. the Razorpay gateway
abstraction in `modules/payments/gateway.py`) are worth reusing when Phase 2-4 build the real
`fuel_stations`, `providers`, `service_packages` and `bookings` tables against the spec's actual
schema (PostGIS geometry, fuel prices/availability, full booking state machine, commission/
settlement records) — the old tables here don't match that schema, so they were not migrated
into PostgreSQL, just retired in place.

Safe to delete once Phase 2-4 are built and nothing here is still being referenced.
