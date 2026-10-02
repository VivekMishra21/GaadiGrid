"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Reveal, RevealGroup } from "@/components/site/reveal";
import { ServiceCard, ServiceCardSkeleton } from "@/components/site/service-card";
import { loadCatalogue, type CatalogueEntry } from "@/lib/backend/catalogue";
import { CAR_WASH_CATEGORIES } from "@/lib/backend/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CarWashPreview() {
  const [entries, setEntries] = useState<CatalogueEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCatalogue(CAR_WASH_CATEGORIES)
      .then((res) => {
        if (!cancelled) setEntries(res.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (entries !== null && entries.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold text-brand-green">Car wash services</span>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Basic wash, interior cleaning, detailing
        </h2>
        <p className="mt-4 text-muted-foreground">Real services, real prices — set by our verified partners.</p>
      </Reveal>

      <RevealGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {entries === null
          ? Array.from({ length: 3 }).map((_, i) => <ServiceCardSkeleton key={i} />)
          : entries.map((entry) => <ServiceCard key={entry.package.id} entry={entry} />)}
      </RevealGroup>

      <div className="mt-8 text-center">
        <Link href="/car-wash" className={cn(buttonVariants({ variant: "outline", size: "default" }), "rounded-full")}>
          See all car wash services
        </Link>
      </div>
    </section>
  );
}
