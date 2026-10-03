"use client";

import { CalendarCheck, ListChecks, SearchCheck } from "lucide-react";

import { Reveal, RevealGroup } from "@/components/site/reveal";

const REASONS = [
  {
    icon: SearchCheck,
    title: "Convenient discovery",
    description: "Fuel stations, car washes and vehicle care — all searchable by location, in one place.",
  },
  {
    icon: ListChecks,
    title: "Clear service details",
    description: "Real prices, durations and provider info up front — no surprises when you arrive.",
  },
  {
    icon: CalendarCheck,
    title: "Booking management",
    description: "Track every appointment's status, reschedule plans, and your history — all in My Bookings.",
  },
];

export function WhyGaadiGrid() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold text-brand-green">Why GaadiGrid</span>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Built to be useful, not flashy</h2>
      </Reveal>

      <RevealGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {REASONS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="lift-card rounded-2xl border border-border bg-card p-6">
            <span className="lift-icon flex size-11 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-5 text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        ))}
      </RevealGroup>
    </section>
  );
}
