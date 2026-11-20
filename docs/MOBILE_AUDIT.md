# GaadiGrid mobile: audit, architecture and integration gaps

Written at the start of the "premium mobile" programme. It records what exists, the decisions taken,
and what is missing. Update it as items close.

## Decisions (agreed with the product owner)

| Topic | Decision |
|---|---|
| Approach | **Evolve the existing app**, not a rewrite. Keep working features and the 100+ tests. |
| Brand | **Keep the emerald identity** (#18A875 on #F8FAF9, Manrope). Add a graphite dark theme using the same accent so app and website stay one brand. The brief's lime (#C7F464) is not adopted. |
| First milestone | **3D My Garage**. |
| Platforms | Android and iOS together. |

## What already exists

- **Backend (FastAPI + PostgreSQL/PostGIS + Redis):** OTP auth with refresh tokens, vehicles, bookings,
  payments (test adapter), expenses, service records, vehicle timeline / cost / passport, need-based
  Smart Pit Stop, reminders, notifications, reviews, disputes, settlements, Fleet Pro (flag off),
  RBAC, audit log. 290+ tests.
- **Mobile (Expo SDK 57, RN 0.86, plain JS):** onboarding with video gateway, sign-up and OTP login,
  vehicle-centric Home, My Garage (overview / timeline / cost / passport), Explore (stations), Services
  (car wash, vehicle care), Pit Stop, Bookings, Expenses, Notifications, Fleet, motion system, Manrope,
  global Button. 110+ tests.
- **Website (Next.js):** marketing, catalogue, booking, auth, account pages.

## Where the brief and the current app differ

| Brief | Today | Plan |
|---|---|---|
| Expo SDK 58 | SDK 57 | Upgrade when 58 is stable and the 3D stack is verified on it. |
| TypeScript strict | JavaScript | Convert feature by feature (new code in TS first); not a big bang. |
| Expo Router | React Navigation | Possible later migration; no user-visible benefit today. |
| Reanimated 4, Skia, Rive, Lottie | RN `Animated` only | Add Skia for charts when the charts milestone starts; Reanimated only where `Animated` is not enough. |
| TanStack Query, RHF, Zod | zustand + hand-rolled hooks | Introduce with the API-layer work; do not rewrite working screens just for this. |
| Sentry, PostHog, EAS | none | Production-readiness phase. |
| Maestro E2E | Jest + RNTL | Add Maestro flows for sign-up, add vehicle, booking. |

## Backend gaps found for the 3D Garage

1. **No manufacturing year** on `vehicles`. (Requested field.)
2. **No current odometer** on `vehicles`. It can be *derived* from the latest service record
   (`service_record_repository.latest_odometer`) and is already used by the passport and Fleet; the
   mobile Garage does not display it yet.
3. **No vehicle image field.** Needs an upload endpoint + storage decision (S3-compatible bucket?).
4. **No 3D model catalogue.** Models are bundled in the app (`src/features/garage/vehicleModels.js`);
   a remote catalogue keyed by brand/model would let models ship without app releases.

Adding optional columns 1 and 3 is additive and does not change existing contracts, but the brief asks
for approval before API changes, so none were made.

## 3D Garage: status

Built:
- `VehicleViewer` chooses between a live 3D view and a fallback. 3D only when the exact brand + model
  has a registered GLB **and** the device is capable (low-end Android and web get the fallback).
- `VehicleViewer3D` (native only, lazy-loaded so three.js costs nothing otherwise): react-three-fiber,
  lighting, contact shadow, auto-fit/centre/scale, drag-to-rotate with coasting, idle drift (off for
  reduced motion), GPU memory released on unmount, error boundary falls back to the hero.
- `VehicleHero` fallback: neutral body-type illustration, plate, fuel, drag parallax, labelled
  "3D view not available for this model yet". It also shows while a model loads, so the Garage is
  never blocked.
- Rotation physics (`TurntableState`) and the model registry are unit-tested.

**Not done / not verified (be honest in release notes):**
- **No 3D model is registered**, so no user sees 3D yet. The repo has no licensed GLB. Obtaining
  correct, licensed, optimised models (< 3 MB, textures ≤ 1024px) per popular Indian model is the
  main blocker and a content/licensing task, not a code task.
- The 3D path has **not been run on a device**. GLTF textures in React Native often need extra
  loader polyfills; this must be tested on a real Android and iOS device with a real GLB before
  claiming the feature. `expo-gl` needs a development build for production use.
- Not yet shown in the Garage: current odometer, manufacturing year, vehicle photo (backend gaps above).

## Next steps (suggested order)

1. Decide on the backend additions (year, image) and approve them.
2. Source licensed GLB models for the top Indian models; register them; test on devices.
3. Garage vehicle detail screen: odometer, year, linked history / expenses / reminders on one page.
4. Vehicle intelligence layer: connect expenses, timeline, reminders and cost per km.
5. Dark theme tokens; Skia charts; Maestro flows; Sentry / PostHog; EAS builds.
