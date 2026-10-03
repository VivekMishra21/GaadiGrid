import Image from "next/image";
import { BadgeCheck, CheckCircle2 } from "lucide-react";

import { Reveal } from "@/components/site/reveal";
import { CATEGORY_LABELS, VEHICLE_CARE_CATEGORIES } from "@/lib/backend/types";

const TRUST_TAGS = ["Verified technicians", "Transparent pricing", "Real bookings, real status"];

export function VehicleCareInspection() {
  return (
    <section className="mt-20 sm:mt-24">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="relative order-2 lg:order-1">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] blur-2xl"
            style={{ background: "color-mix(in oklch, var(--brand-orange), transparent 90%)" }}
          />
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border shadow-2xl shadow-black/25 sm:aspect-[4/3]">
            <Image
              src="/images/vehicle-care-inspection.png"
              alt="A GaadiGrid technician closely inspecting a car's fender and tyre with a gloss meter"
              fill
              sizes="(min-width: 1024px) 552px, 100vw"
              className="object-cover object-[60%_40%]"
            />
            <div
              aria-hidden
              className="absolute inset-0 rounded-2xl"
              style={{ boxShadow: "inset 0 0 0 1px rgba(17,24,26,0.06)" }}
            />
          </div>
        </Reveal>

        <Reveal className="order-1 lg:order-2" delay={0.1}>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand-orange" />
            How we work
          </span>

          <h2 className="mt-5 text-3xl leading-[1.15] font-semibold tracking-tight text-balance sm:text-4xl">
            Trained eyes catch what a quick glance misses
          </h2>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            Every GaadiGrid partner is a working technician, not a call-centre booking
            desk — panel dents, paint condition, tyre wear and battery health get a real
            look before any work starts, so the quote you see matches the job that gets
            done.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {VEHICLE_CARE_CATEGORIES.filter((c) => c !== "OTHER").map((category) => (
              <span
                key={category}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground"
              >
                {CATEGORY_LABELS[category]}
              </span>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            {TRUST_TAGS.map((tag) => (
              <span key={tag} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-brand-green" />
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-7 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BadgeCheck className="size-3.5 text-brand-green" />
            Every partner reviewed and verified before going live on GaadiGrid
          </p>
        </Reveal>
      </div>
    </section>
  );
}
