"use client";

import { Suspense, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { MotionConfig, motion } from "motion/react";
import {
  AlarmClock,
  AlertCircle,
  Bell,
  CalendarCheck,
  CarFront,
  Droplets,
  Fuel,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/site/logo";
import { EASE, useIsDesktop } from "@/lib/motion";

// The shared look of the Log in and Sign up pages: automotive hero, service dock, and the white card.

/* ------------------------------------------------------------------ hero */

const SERVICES: { label: string; Icon: LucideIcon; color: string }[] = [
  { label: "Fuel & CNG", Icon: Fuel, color: "#18A875" },
  { label: "Car Wash", Icon: Droplets, color: "#2F8FE0" },
  { label: "Vehicle Care", Icon: Wrench, color: "#FF8A34" },
  { label: "Bookings", Icon: CalendarCheck, color: "#0E9F9F" },
  { label: "My Garage", Icon: CarFront, color: "#11181A" },
  { label: "Expenses", Icon: Wallet, color: "#C98A14" },
  { label: "Reminders", Icon: AlarmClock, color: "#7C5CE0" },
  { label: "Notifications", Icon: Bell, color: "#E5484D" },
];

// How many services fit comfortably: 4 on phones/tablets, 6 on laptops, all 8 on large desktops.
function subscribeToWidth(onChange: () => void) {
  const queries = ["(min-width: 1280px)", "(min-width: 1024px)"].map((q) => window.matchMedia(q));
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}
const serviceCount = () =>
  window.matchMedia("(min-width: 1280px)").matches ? 8 : window.matchMedia("(min-width: 1024px)").matches ? 6 : 4;

function ServiceCard({
  index,
  label,
  Icon,
  color,
}: {
  index: number;
  label: string;
  Icon: LucideIcon;
  color: string;
}) {
  return (
    <motion.li
      className="flex min-w-0 flex-col items-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.85 + index * 0.07 }}
    >
      <div className="group flex flex-col items-center gap-2">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white/90 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.45)] transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-[3px] group-hover:shadow-[0_14px_28px_-8px_rgba(0,0,0,0.55)]">
          <Icon
            className="size-5 transition-transform duration-300 ease-out group-hover:scale-105"
            style={{ color }}
            strokeWidth={1.9}
            aria-hidden
          />
        </span>
        <span className="whitespace-nowrap text-[11px] font-semibold leading-none text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.55)] xl:text-xs">
          {label}
        </span>
      </div>
    </motion.li>
  );
}

function ServiceDock() {
  const count = useSyncExternalStore(subscribeToWidth, serviceCount, () => 6);
  const half = count / 2;

  const cells = SERVICES.slice(0, count).map((s, i) => <ServiceCard key={s.label} index={i} {...s} />);
  const hub = (
    // GaadiGrid mark: the hub the services connect through, centred under the car
    <motion.li
      key="hub"
      aria-hidden
      className="flex justify-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.8 }}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.45)]">
        <LogoMark className="size-5" />
      </span>
    </motion.li>
  );

  return (
    <ul
      aria-label="GaadiGrid services"
      className="absolute inset-x-6 bottom-6 z-10 mx-auto grid max-w-[760px] items-start gap-x-2 sm:inset-x-10 lg:bottom-10 xl:inset-x-12"
      style={{ gridTemplateColumns: `repeat(${half}, minmax(0, 1fr)) 40px repeat(${half}, minmax(0, 1fr))` }}
    >
      {cells.slice(0, half)}
      {hub}
      {cells.slice(half)}
    </ul>
  );
}

export type AuthVariant = "sunset" | "day";
export type AuthPhoto = { src: string; alt: string };

function AuthHero({ variant = "sunset", photo }: { variant?: AuthVariant; photo?: AuthPhoto }) {
  // "day": a bright 16:9 photo with its own service icons baked in, so no dock, scrims or glow on top.
  const day = variant === "day";

  return (
    <motion.div
      className={cn(
        "relative isolate w-full shrink-0 overflow-hidden lg:h-auto lg:w-[55%] xl:w-[60%]",
        day ? "h-[20rem] bg-[#e2edf3] sm:h-[30rem]" : "h-[28rem] bg-[#241a14] sm:h-[36rem]"
      )}
      style={{ containerType: "size" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {/* Photo frame. Sized from the panel width so the whole car always fits, bottom-aligned above
          the service dock; when the panel is taller than the photo the top edge fades into the sky tone. */}
      <div className="absolute inset-0">
        <motion.div
          className={cn(
            "absolute aspect-[3/2]",
            day
              ? "bottom-0 left-0 aspect-[16/9] w-[max(100cqw,110cqh)]"
              : "bottom-10 left-1/2 w-[calc(100cqw/0.72)] -translate-x-[55%] lg:bottom-14"
          )}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        >
          <div
            className="absolute inset-0"
            style={{ maskImage: `linear-gradient(to bottom, transparent 0%, #000 ${day ? 20 : 26}%)` }}
          >
            <Image
              src={photo?.src ?? (day ? "/images/gaadigrid-signup-day.jpg" : "/images/gaadigrid-signup-sunset.jpg")}
              alt={
                photo?.alt ??
                (day
                  ? "A young GaadiGrid driver leaning on his white SUV outside a modern home, checking the app on his phone, with fuel, car wash, vehicle care, bookings, garage, expenses and reminders connected around the car"
                  : "A GaadiGrid driver stepping out of his white EV at sunset beside a lake and hills")
              }
              fill
              priority
              sizes="(min-width: 1280px) 90vw, (min-width: 1024px) 80vw, 150vw"
              className="object-cover"
            />
          </div>
        </motion.div>
      </div>

      {day ? null : (
        <>
          {/* legibility only: the logo/headline zone and the service labels */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(12,14,14,0.5) 0%, transparent 34%), linear-gradient(to top, rgba(12,14,14,0.55) 0%, transparent 24%)",
            }}
          />
        </>
      )}

      <Link href="/" aria-label="GaadiGrid home" className="absolute left-6 top-6 z-20 sm:left-10 sm:top-10 xl:left-12 xl:top-12">
        <Logo tone={day ? "default" : "light"} wordmarkClassName="text-xl" />
      </Link>

      <motion.div
        className="absolute left-10 top-28 z-20 hidden max-w-sm lg:block xl:left-12 xl:top-32 xl:max-w-lg"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
      >
        <h2 className={cn("text-4xl font-bold leading-[1.1] tracking-tight xl:text-[44px]", day ? "text-foreground" : "text-white")}>
          Welcome to GaadiGrid
        </h2>
        <p className={cn("mt-4 text-lg font-medium leading-relaxed", day ? "text-foreground/70" : "text-white/90")}>
          Everything around your car, connected in one place.
        </p>
      </motion.div>

      {day ? null : <ServiceDock />}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ card */

export const inputClass = (error?: boolean) =>
  cn(
    "h-14 w-full rounded-xl border bg-white px-4 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground/80 focus:border-brand-green focus:ring-4 focus:ring-brand-green/15",
    error ? "border-destructive" : "border-[#e3e8e6]"
  );

export function Field({
  id,
  label,
  icon: Icon,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string | null;
  children: (props: { id: string; className: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} aria-hidden />
        {children({
          id,
          "aria-invalid": !!error,
          "aria-describedby": error ? `${id}-error` : undefined,
          className: cn(inputClass(!!error), "pl-12"),
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Primary auth button. Hover lift + press scale come from the global Button; the arrow nudges 4px.
export const ctaClass = "group/cta h-14 rounded-xl text-base";
export const CtaArrow = (
  <span aria-hidden className="inline-block transition-transform duration-200 ease-out group-hover/cta:translate-x-1">
    →
  </span>
);

/** The floating white card. On phones it flattens into a plain full-width section. */
export function AuthCard({ children }: { children: ReactNode }) {
  const desktop = useIsDesktop();
  return (
    <motion.div
      className="w-full max-w-[480px] sm:rounded-3xl sm:border sm:border-black/[0.06] sm:bg-white sm:p-10 sm:shadow-[0_24px_60px_-32px_rgba(17,24,26,0.25)] sm:transition-shadow sm:duration-300 sm:hover:shadow-[0_28px_70px_-30px_rgba(17,24,26,0.32)] lg:p-8 xl:p-12"
      initial={{ opacity: 0, x: desktop ? 20 : 0, y: desktop ? 0 : 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

/** Full-bleed split screen: hero on the left, form on the right (stacked on small screens). */
export function AuthShell({ children, variant, photo }: { children: ReactNode; variant?: AuthVariant; photo?: AuthPhoto }) {
  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-screen flex-col overflow-x-clip bg-[#f8faf9] lg:flex-row">
        <AuthHero variant={variant} photo={photo} />

        <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-10 sm:px-8 sm:py-14 lg:w-[45%] lg:px-6 xl:w-[40%]">
          {/* Phones/tablets: the welcome copy sits under the photo instead of on it. */}
          <div className="mb-8 w-full max-w-[480px] lg:hidden">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome to GaadiGrid</h2>
            <p className="mt-2 text-base text-muted-foreground">Everything around your car, connected in one place.</p>
          </div>

          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </main>
    </MotionConfig>
  );
}
