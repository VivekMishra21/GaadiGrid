"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden md:flex md:h-[600px] md:items-center">
      {/* Full-bleed background photo — desktop/tablet only. It's a wide landscape shot, so on
          narrow viewports object-cover zooms in until the car fills the whole frame and leaves
          no room for copy; below md we show it as a contained card instead, stacked under the
          text, so both the car and the heading stay clearly visible. */}
      <Image
        src="/images/gaadigrid-hero.png"
        alt="A white GaadiGrid-mapped SUV driving past a fuel station on a sunlit city road"
        fill
        priority
        sizes="100vw"
        className="-z-20 hidden object-cover object-[68%_center] md:block"
      />

      {/* Left-to-right navy fade so headline copy stays legible over the photo, plus a bottom
          fade so this section blends into the page background. */}
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

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-6xl px-5 pt-16 pb-12 md:pt-0 md:pb-0"
      >
        <div className="max-w-xl">
          <motion.h1
            variants={item}
            className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Every drive{" "}
            <span className="bg-gradient-to-r from-brand-green to-emerald-300 bg-clip-text text-transparent">
              starts here.
            </span>
          </motion.h1>

          <motion.p variants={item} className="mt-5 max-w-md text-lg text-muted-foreground text-balance">
            Find fuel and CNG stations near you. Discover car washes and vehicle care services.
            Plan your next stop with GaadiGrid.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="/find-fuel"
              className={cn(buttonVariants({ size: "lg" }), "group rounded-full px-7 text-base")}
            >
              Explore Nearby
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="/car-wash"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full px-7 text-base md:border-white/25 md:bg-black/20 md:backdrop-blur md:hover:bg-black/30"
              )}
            >
              Book a Car Wash
            </a>
          </motion.div>

          <motion.p variants={item} className="mt-6 text-sm font-semibold text-muted-foreground">
            Fuel. Clean. Care. Drive.
          </motion.p>
        </div>

        {/* Contained photo card — mobile/small-tablet only, replaces the full-bleed background. */}
        <motion.div
          variants={item}
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
      </motion.div>
    </section>
  );
}
