"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Droplets, Fuel, Wallet, Wrench, CarFront, type LucideIcon } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { DURATION, EASE, fadeUp, useIsDesktop } from "@/lib/motion";

/* The hero photo is 1672×941. Everything that must stay attached to the car (the connected
   services) is positioned in percentages of the photo, inside a frame that reproduces
   `object-cover object-[68%_center]` — so the lines always land on the car, at any width. */
const PHOTO_RATIO = 1672 / 941;
const FRAME_W = `max(100cqw, ${(PHOTO_RATIO * 100).toFixed(1)}cqh)`;

// Roof centre of the car, as % of the photo.
const ANCHOR = { x: 62, y: 34 };

type Node = { label: string; Icon: LucideIcon; x: number; y: number; show: string };

// Five services, fanned above the car: Car → line → service. The two left-most only appear on
// very wide screens, where there is room next to the headline.
const NODES: Node[] = [
  { label: "My Garage", Icon: CarFront, x: 54, y: 27, show: "hidden 2xl:flex" },
  { label: "Vehicle Care", Icon: Wrench, x: 63, y: 22, show: "flex" },
  { label: "Car Wash", Icon: Droplets, x: 72.5, y: 20, show: "flex" },
  { label: "Expenses", Icon: Wallet, x: 82, y: 23, show: "flex" },
  { label: "Fuel & CNG", Icon: Fuel, x: 90, y: 29.5, show: "flex" },
];

function curve(n: Node) {
  // a soft quadratic from the car to the service: leaves the car upward, arrives from below
  const cx = (ANCHOR.x + n.x) / 2;
  const cy = Math.min(ANCHOR.y, n.y) - 1;
  const ey = n.y + 3.2; // stop just under the card
  return `M ${ANCHOR.x} ${ANCHOR.y} Q ${cx} ${cy} ${n.x} ${ey}`;
}

function Ecosystem() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {NODES.map((n, i) => (
          <motion.path
            key={n.label}
            d={curve(n)}
            fill="none"
            stroke="var(--brand-green)"
            strokeOpacity={0.5}
            strokeWidth={1.25}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className={n.show === "flex" ? "" : "max-2xl:hidden"}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 1.0 + i * 0.08 }}
          />
        ))}
      </svg>

      {/* the car end of every line */}
      <motion.span
        className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-green ring-4 ring-brand-green/20"
        style={{ left: `${ANCHOR.x}%`, top: `${ANCHOR.y}%` }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE, delay: 0.95 }}
      />

      {NODES.map(({ label, Icon, x, y, show }, i) => (
        <motion.div
          key={label}
          className={`absolute -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl bg-white/90 px-3 py-2 shadow-[0_6px_18px_-8px_rgba(17,24,26,0.35)] ring-1 ring-black/5 ${show}`}
          style={{ left: `${x}%`, top: `${y}%` }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE, delay: 1.2 + i * 0.08 }}
        >
          <Icon className="size-4 text-brand-green" strokeWidth={2} />
          <span className="whitespace-nowrap text-xs font-semibold text-foreground">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const desktop = useIsDesktop();

  // Very restrained depth: the photo drifts a few pixels and grows ~3% as the page scrolls away.
  // Desktop only; off for reduced motion and on phones/tablets.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const driftX = useTransform(scrollYProgress, [0, 1], [0, -14]);
  const driftScale = useTransform(scrollYProgress, [0, 1], [1, 1.03]);
  const depth = desktop && !reduced;

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden md:flex md:h-[600px] md:items-center md:[container-type:size]"
    >
      {/* Full-bleed background photo — desktop/tablet only. It's a wide landscape shot, so on
          narrow viewports object-cover zooms in until the car fills the whole frame and leaves
          no room for copy; below md we show it as a contained card instead, stacked under the
          text, so both the car and the heading stay clearly visible. */}
      <motion.div
        className="absolute inset-0 -z-20 hidden md:block"
        style={depth ? { x: driftX, scale: driftScale } : undefined}
      >
        {/* the car: a short, soft slide into place (no bounce, no rotation) */}
        <motion.div
          className="absolute"
          style={{
            width: FRAME_W,
            aspectRatio: `${PHOTO_RATIO}`,
            left: `calc((100cqw - ${FRAME_W}) * 0.68)`,
            top: `calc((100cqh - ${FRAME_W} / ${PHOTO_RATIO}) * 0.5)`,
          }}
          initial={{ opacity: 0, x: reduced ? 0 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: DURATION.car, ease: EASE, delay: 0.1 }}
        >
          <Image
            src="/images/gaadigrid-hero.png"
            alt="A white GaadiGrid-mapped SUV driving past a fuel station on a sunlit city road"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <Ecosystem />
        </motion.div>
      </motion.div>

      {/* Left-to-right background fade so headline copy stays legible over the photo, plus a
          bottom fade so this section blends into the page background. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden md:block"
        style={{
          background:
            "linear-gradient(90deg, var(--background) 0%, color-mix(in oklch, var(--background), transparent 6%) 30%, color-mix(in oklch, var(--background), transparent 45%) 48%, color-mix(in oklch, var(--background), transparent 82%) 66%, transparent 85%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 hidden h-24 md:block"
        style={{ background: "linear-gradient(to top, var(--background), transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 md:hidden"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--brand-green), transparent 82%) 0%, transparent 70%)",
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-5 pt-16 pb-12 md:pt-0 md:pb-0">
        <div className="max-w-xl">
          <motion.h1
            {...fadeUp(0.05, 16)}
            className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Every drive{" "}
            <span className="bg-gradient-to-r from-brand-green to-emerald-300 bg-clip-text text-transparent">
              starts here.
            </span>
          </motion.h1>

          <motion.p {...fadeUp(0.15, 16)} className="mt-5 max-w-md text-lg text-muted-foreground text-balance">
            Find fuel and CNG stations near you. Discover car washes and vehicle care services.
            Plan your next stop with GaadiGrid.
          </motion.p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <motion.div {...fadeUp(0.25, 12, 0.45)}>
              <ButtonLink
                href="/find-fuel"
                size="lg"
                className="group rounded-full px-7"
                rightIcon={<ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
              >
                Explore Nearby
              </ButtonLink>
            </motion.div>
            <motion.div {...fadeUp(0.32, 12, 0.45)}>
              <ButtonLink
                href="/car-wash"
                variant="secondary"
                size="lg"
                className="rounded-full px-7 backdrop-blur-md md:bg-card/80 md:hover:bg-card"
              >
                Book a Car Wash
              </ButtonLink>
            </motion.div>
          </div>

          <motion.p {...fadeUp(0.4, 8, 0.45)} className="mt-6 text-sm font-semibold text-muted-foreground">
            Fuel. Clean. Care. Drive.
          </motion.p>
        </div>

        {/* Contained photo card — mobile/small-tablet only, replaces the full-bleed background. */}
        <motion.div
          {...fadeUp(0.3, 16, DURATION.slow)}
          className="relative mt-10 aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border md:hidden"
        >
          <Image
            src="/images/gaadigrid-hero.png"
            alt="A white GaadiGrid-mapped SUV driving past a fuel station on a sunlit city road"
            fill
            sizes="calc(100vw - 40px)"
            className="object-cover object-[60%_center]"
          />
        </motion.div>
      </div>
    </section>
  );
}
