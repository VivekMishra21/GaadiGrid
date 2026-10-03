"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { Reveal, RevealGroup } from "@/components/site/reveal";

const STEPS = [
  {
    number: "01",
    title: "Set your location",
    description: "Search near you or choose where you're headed.",
  },
  {
    number: "02",
    title: "Explore your options",
    description: "View station or service details and choose what works for you.",
  },
  {
    number: "03",
    title: "Drive or book",
    description: "Get directions to a station or reserve a service appointment.",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // The emerald indicator fills as the steps scroll past: a quiet "progress along the route".
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start 70%", "end 60%"] });
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-5 py-24 md:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold text-brand-orange">How GaadiGrid works</span>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Less time searching. More time moving.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Whether you need a quick fuel stop or a car wash this weekend, GaadiGrid brings your
          vehicle needs together in one place.
        </p>
      </Reveal>

      <Reveal className="mt-14 text-center text-sm font-semibold text-muted-foreground">Three simple steps</Reveal>

      <div ref={sectionRef} className="relative mt-8">
        <div className="absolute top-0 bottom-0 left-5 hidden w-px bg-border sm:block" aria-hidden />
        <motion.div
          className="absolute top-0 bottom-0 left-5 hidden w-px origin-top bg-brand-green sm:block"
          style={{ scaleY: reduced ? 1 : fill }}
          aria-hidden
        />

        <RevealGroup className="flex flex-col gap-10">
          {STEPS.map((step) => (
            <div key={step.number} className="relative flex gap-6 sm:pl-2">
              <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-bold text-brand-green">
                {step.number}
              </span>
              <div className="pt-1">
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
