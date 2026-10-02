import { Reveal } from "@/components/site/reveal";
import { WaitlistForm } from "@/components/site/waitlist-form";

export function WaitlistSection() {
  return (
    <section id="waitlist" className="relative overflow-hidden py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 100%, color-mix(in oklch, var(--brand-green), transparent 88%) 0%, transparent 70%)",
        }}
      />
      <Reveal className="mx-auto max-w-2xl px-5 text-center">
        <span className="text-sm font-semibold text-brand-green">Not in Noida?</span>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Be first in line when we reach your city
        </h2>
        <p className="mt-4 text-muted-foreground">
          GaadiGrid is live in Noida today. No spam, ever — just one email when we launch near you.
        </p>

        <div className="mt-10 rounded-3xl border border-border bg-card p-6 text-left sm:p-8">
          <WaitlistForm />
        </div>
      </Reveal>
    </section>
  );
}
