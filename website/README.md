# GaadiGrid website

The GaadiGrid marketing/landing site — a standalone app, independent of `backend/` (FastAPI +
PostgreSQL) and the other frontends in this monorepo. It has its own stack and its own database:

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Animation:** [Motion](https://motion.dev) for buttons, cards, and menu transitions; GSAP +
  ScrollTrigger for scroll-driven reveals
- **API:** Next.js Route Handlers under `src/app/api/*` (REST, JSON)
- **Database:** MongoDB, accessed through Prisma ORM (`prisma/schema.prisma`)

## Getting started

1. Start the site's MongoDB (from the repo root, not this folder):

   ```bash
   docker compose up -d mongo mongo-init
   ```

   This runs a single-node MongoDB replica set (required by Prisma's MongoDB connector for
   transactions) namespaced as `gaadigrid-customer-mongo`, separate from the Postgres/Redis used
   by `backend/`.

2. Copy the env file and adjust if needed:

   ```bash
   cp .env.example .env
   ```

3. Install dependencies and push the Prisma schema:

   ```bash
   npm install
   npx prisma db push
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Structure

- `src/app/page.tsx` — the landing page, assembled from `src/components/site/*` sections (Hero,
  Features, How It Works, FAQ, Waitlist, Footer).
- `src/app/api/waitlist/route.ts`, `src/app/api/contact/route.ts` — the site's REST API, validated
  with `zod` and persisted via `src/lib/prisma.ts`.
- `src/app/privacy`, `src/app/terms` — static legal pages for the site itself (not the mobile app).
- `prisma/schema.prisma` — `WaitlistSignup` and `ContactMessage` models.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
npx prisma studio # inspect the website's MongoDB data
```
