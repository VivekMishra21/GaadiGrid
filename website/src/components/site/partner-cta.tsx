import Link from "next/link";

import { Reveal } from "@/components/site/reveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PartnerCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
      <Reveal className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(50% 60% at 50% 0%, color-mix(in oklch, var(--brand-orange), transparent 88%) 0%, transparent 70%)",
          }}
        />
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Grow with GaadiGrid</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Run a fuel station, car wash, or vehicle care business? Help more local drivers
          discover your services.
        </p>
        <Link href="/partner" className={cn(buttonVariants({ size: "lg" }), "mt-8 rounded-full px-7")}>
          Become a Partner
        </Link>
      </Reveal>
    </section>
  );
}
