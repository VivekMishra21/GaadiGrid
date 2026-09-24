# Deployment guide

This describes how each service in the monorepo is built and run outside local dev.
**This repository is not production-ready as-is** — see
[`RISKS_AND_PENDING_INTEGRATIONS.md`](RISKS_AND_PENDING_INTEGRATIONS.md) for the checklist that must be
cleared first (real SMS/payment credentials, TLS, CORS origins, JWT secret, etc.).

## Services and how they're deployed

| Service | How it's built | How it's served |
|---|---|---|
| `backend/` | `backend/Dockerfile` (Python 3.12-slim, installs `requirements.txt`) | `uvicorn` on port 8000 behind a reverse proxy / load balancer that terminates TLS |
| `admin-web/` | `admin-web/Dockerfile` (multi-stage: `npm run build` → static files) | nginx on port 80, config in `admin-web/nginx.conf` |
| `provider-web/` | `provider-web/Dockerfile` (identical pattern) | nginx on port 80, config in `provider-web/nginx.conf` |
| `mobile/` | Expo managed workflow — no Dockerfile (not applicable) | EAS Build (`npx eas build`) for app store binaries, or `expo start --web` output for a web build; `eas.json` isn't configured in this repo yet |

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: lint + test for all four apps, plus a production
`npm run build` for admin-web/provider-web (catches build-time errors like missing env vars or broken imports
before they'd surface at deploy time) and an `alembic upgrade head` dry-run against a throwaway Postgres service
container for the backend. Treat a red CI run as a hard blocker — don't deploy past it.

## Building the frontend images

`VITE_API_BASE_URL` is compiled into the JS bundle by Vite at *build* time, not read at container start — so it
must be passed as a Docker build arg, not a runtime environment variable:

```bash
docker build -t gaadigrid-admin-web \
  --build-arg VITE_API_BASE_URL=https://api.yourdomain.com \
  ./admin-web

docker build -t gaadigrid-provider-web \
  --build-arg VITE_API_BASE_URL=https://api.yourdomain.com \
  ./provider-web
```

Each image's `nginx.conf` sends baseline security headers (`X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, a `Content-Security-Policy`) and serves the SPA with a `try_files` fallback to `index.html`
for any path, with `index.html` itself set to `no-store` so a redeploy is picked up immediately while hashed
JS/CSS assets are cached for a year.

## Building the backend image

```bash
docker build -t gaadigrid-backend ./backend
```

Needs every variable in `backend/.env.example` supplied at runtime (via `--env-file`, your orchestrator's
secrets mechanism, etc.) — most importantly `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY` (never the repo's dev
default in any non-local environment), `ENVIRONMENT=production`, and real (non-`dev`) `OTP_PROVIDER`/
`PAYMENT_PROVIDER` values — the app deliberately refuses to start in production with either left as `dev` (see
`app/main.py`'s `lifespan()`). `WEATHER_PROVIDER=openweathermap` and `PUSH_PROVIDER=expo` are optional but
already fully implemented (see `docs/PHASE_6_COMPLETION.md`) — there's no boot-guard forcing you off `dev` for
either, since both are advisory-only.

## Database migrations in production

Run `alembic upgrade head` (from `backend/`, with `DATABASE_URL` pointed at the production database) as a
release step **before** the new backend image starts serving traffic — not automatically on container boot,
so a bad migration never gets a chance to run unattended. Never run `alembic downgrade` against production data
without a fresh backup in hand first; several migrations (e.g. Phase 5's `providers.is_verified` column drop)
are not safely reversible without data loss.

## Web sessions and cookies

Phase 7's security pass moved the admin-web/provider-web refresh token out of `localStorage` into an `httpOnly`
cookie the backend sets (see `docs/PHASE_7_COMPLETION.md`). This has two deployment implications:

- The cookie is scoped to `/api/v1/auth` and marked `Secure` automatically once `ENVIRONMENT=production` — so
  the backend **must** actually be served over HTTPS in production, or the browser will silently refuse to
  store the cookie and every admin/provider session will appear to log out on refresh.
- `SameSite=Lax` is used, which works for admin-web/provider-web and the backend API being different subdomains
  or ports of the same site (e.g. `admin.yourdomain.com` calling `api.yourdomain.com`). If they end up on
  genuinely different registrable domains, switch the cookie to `SameSite=None` (still `Secure`) in
  `backend/app/routers/auth.py`'s `_set_refresh_cookie`.

## What's not covered here yet

Load balancer / ingress configuration, autoscaling, log aggregation, and the database backup automation flagged
in the root README's "Backup and migration notes" section are all environment-specific and intentionally left
for whoever stands up the actual hosting, rather than guessed at here.
