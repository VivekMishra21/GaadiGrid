import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/site/reveal";

const FAQS = [
  {
    question: "Which areas does GaadiGrid cover right now?",
    answer:
      "We're live in Noida first, with real station listings and a small set of verified car wash and vehicle care partners. We'll expand city by city from here.",
  },
  {
    question: "How do I book a service?",
    answer:
      "Pick a service on Car Wash or Vehicle Care, choose a date and an open time slot, select your vehicle, and confirm. The partner then reviews and confirms your booking.",
  },
  {
    question: "Can I cancel a booking?",
    answer:
      "Yes — open My Bookings and cancel anything that hasn't been completed yet. Once a provider marks it in progress or completed, it can no longer be cancelled.",
  },
  {
    question: "Do I need to pay online?",
    answer:
      "Not yet — online payment is on our roadmap. For now, bookings are confirmed by the partner and payment happens directly with them.",
  },
  {
    question: "Do I need an account to see fuel prices?",
    answer:
      "Browsing stations and prices is open to everyone. Creating a free account lets you book services, save your vehicles, and track bookings.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-24 md:py-32">
      <Reveal className="text-center">
        <span className="text-sm font-semibold text-brand-green">FAQ</span>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Questions, answered
        </h2>
      </Reveal>

      <Reveal className="mt-12 rounded-2xl border border-border bg-card px-6">
        <Accordion>
          {FAQS.map((faq, index) => (
            <AccordionItem key={faq.question} value={String(index)}>
              <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
