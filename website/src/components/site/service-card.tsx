import Link from "next/link";
import { motion } from "motion/react";
import { Clock, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";

import { CATEGORY_LABELS } from "@/lib/backend/types";
import type { CatalogueEntry } from "@/lib/backend/catalogue";

export function ServiceCard({ entry }: { entry: CatalogueEntry }) {
  const { package: pkg, provider } = entry;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={
        "group relative flex flex-col rounded-2xl border bg-card p-5 transition-colors " +
        (provider.is_sponsored ? "border-brand-orange/40 hover:border-brand-orange/60" : "border-border hover:border-brand-green/40")
      }
    >
      {provider.is_sponsored ? (
        <span className="absolute -top-2.5 left-5 flex items-center gap-1 rounded-full bg-brand-orange px-2.5 py-0.5 text-[11px] font-bold text-white">
          <Star className="size-3 fill-white" />
          Sponsored
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green transition-colors group-hover:bg-brand-green group-hover:text-primary-foreground">
          <Sparkles className="size-5" />
        </span>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {CATEGORY_LABELS[pkg.category] || pkg.category}
        </span>
      </div>

      <h3 className="mt-4 font-semibold text-foreground">{pkg.name}</h3>
      {pkg.description ? <p className="mt-1.5 text-sm text-muted-foreground">{pkg.description}</p> : null}

      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="size-3.5" />
        {provider.business_name} · {provider.locality ? `${provider.locality}, ${provider.city}` : provider.city}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {pkg.duration_minutes} min{pkg.is_doorstep ? " · At your doorstep" : " · At the service center"}
      </div>
      {provider.verification_status === "VERIFIED" ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-green">
          <ShieldCheck className="size-3.5" />
          Verified business
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between">
        <span className="text-lg font-bold text-foreground">₹{pkg.price.toFixed(0)}</span>
        <Link
          href={`/book/${provider.id}/${pkg.id}`}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/85 hover:shadow-lg hover:shadow-primary/20 active:scale-95"
        >
          Book
        </Link>
      </div>
    </motion.div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="size-11 animate-pulse rounded-xl bg-muted" />
      <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
      <div className="mt-6 h-6 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}
