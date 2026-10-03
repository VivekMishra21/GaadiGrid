"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { MotionConfig, motion } from "motion/react";
import { ArrowRight, MapPin, PackageSearch } from "lucide-react";

import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Reveal, RevealGroup } from "@/components/site/reveal";
import { ServiceCard, ServiceCardSkeleton } from "@/components/site/service-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadCatalogue, type CatalogueEntry } from "@/lib/backend/catalogue";
import { ApiError } from "@/lib/backend/client";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

interface HeroConfig {
  src: string;
  alt: string;
  eyebrow: string;
  heading: string;
  description: string;
  buttonLabel: string;
}

export function CataloguePage({
  title,
  description,
  categories,
  emptyMessage,
  hero,
  children,
}: {
  title: string;
  description: string;
  categories: string[];
  emptyMessage: string;
  hero?: HeroConfig;
  children?: ReactNode;
}) {
  const [entries, setEntries] = useState<CatalogueEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCatalogue(categories)
      .then((res) => {
        if (!cancelled) setEntries(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setEntries([]);
        setError(err instanceof ApiError ? err.message : "Couldn't load services right now.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        {hero ? (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[5fr_7fr] lg:gap-14"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -left-20 -z-10 size-72 rounded-full blur-3xl"
              style={{ background: "color-mix(in oklch, var(--brand-green), transparent 88%)" }}
            />

            <motion.div variants={item} className="flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                <span className="size-1.5 rounded-full bg-brand-green" />
                {hero.eyebrow}
              </span>

              <h1 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
                {hero.heading}
              </h1>

              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
                {hero.description}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <motion.a
                  href="#services"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "group w-full rounded-full px-7 sm:w-fit"
                  )}
                >
                  {hero.buttonLabel}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>

                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MapPin className="size-3.5 text-brand-green" />
                  Launching in Noida first — more cities coming soon
                </span>
              </div>
            </motion.div>

            <motion.div variants={item} className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] blur-2xl"
                style={{ background: "color-mix(in oklch, var(--brand-green), transparent 90%)" }}
              />
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-2xl shadow-black/25">
                <Image
                  src={hero.src}
                  alt={hero.alt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 690px, 100vw"
                  className="object-contain"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-2xl"
                  style={{ boxShadow: "inset 0 0 0 1px rgba(17,24,26,0.06)" }}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <Reveal>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">{description}</p>
            <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="size-3.5 text-brand-green" />
              Launching in Noida first — more cities coming soon
            </p>
          </Reveal>
        )}

        <Reveal className="mt-16 sm:mt-20">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Available services
          </h2>
        </Reveal>

        <RevealGroup id="services" className="mt-6 grid scroll-mt-24 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {entries === null
            ? Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)
            : entries.map((entry) => <ServiceCard key={entry.package.id} entry={entry} />)}
        </RevealGroup>

        {entries !== null && entries.length === 0 && !error ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
            <PackageSearch className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : null}

        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}

        {children}
      </main>
      <Footer />
    </MotionConfig>
  );
}
