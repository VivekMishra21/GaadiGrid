import { MapPin, ShieldCheck, Sparkles } from "lucide-react";

import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

export const metadata = {
  title: "About GaadiGrid",
  description: "GaadiGrid helps drivers find fuel and CNG stations, book car wash and vehicle care — starting in Noida.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">About GaadiGrid</h1>
        <p className="mt-4 text-lg text-muted-foreground text-balance">
          GaadiGrid brings fuel discovery, car wash and vehicle care together in one place — so
          drivers spend less time searching and more time moving.
        </p>

        <div className="mt-10 flex flex-col gap-6">
          <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
              <MapPin className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">Where we operate</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;re starting in Noida, mapping real fuel and CNG stations and onboarding
                local car wash and vehicle care partners. We&apos;ll expand city by city as we
                build out coverage — no promises about a city before we&apos;ve actually got
                partners live there.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">How we verify partners</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every car wash and vehicle care business on GaadiGrid goes through a verification
                review before it&apos;s listed. We show real prices and durations set by the partner,
                not estimates.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">What&apos;s next</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Online payments, verified reviews, route-aware station suggestions and live queue
                signals are all on our roadmap as we grow past Noida.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
