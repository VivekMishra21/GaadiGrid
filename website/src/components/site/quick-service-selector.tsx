"use client";

import Link from "next/link";
import { Fuel, Sparkles, Wrench } from "lucide-react";

import { Reveal, RevealGroup } from "@/components/site/reveal";

const SERVICES = [
  {
    href: "/find-fuel",
    icon: Fuel,
    title: "Find Fuel & CNG",
    description: "Discover stations near your location and find a convenient stop along your route.",
  },
  {
    href: "/car-wash",
    icon: Sparkles,
    title: "Book a Car Wash",
    description: "Explore available wash services, choose a time, and give your car the care it deserves.",
  },
  {
    href: "/vehicle-care",
    icon: Wrench,
    title: "Explore Vehicle Care",
    description: "Find services that help keep your vehicle ready for the road.",
  },
];

export function QuickServiceSelector() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
      <Reveal className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">What do you need today?</h2>
      </Reveal>

      <RevealGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {SERVICES.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href} className="lift-card group flex h-full flex-col rounded-2xl border border-border bg-card p-6">
              <span className="lift-icon flex size-11 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green group-hover:bg-brand-green group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </Link>
        ))}
      </RevealGroup>
    </section>
  );
}
