import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ContactForm } from "@/components/site/contact-form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata = {
  title: "Help & Contact",
  description: "Questions about GaadiGrid bookings, availability, cancellations or payment — get in touch.",
};

const HELP_FAQS = [
  {
    question: "How do I book a car wash or vehicle care service?",
    answer:
      "Browse Car Wash or Vehicle Care, pick a service, choose a date and time slot the partner has open, select your vehicle, and confirm. The partner then reviews and confirms your booking.",
  },
  {
    question: "Can I cancel a booking?",
    answer:
      "Yes — go to My Bookings and select Cancel on any booking that hasn't been completed yet. Once a provider marks a booking as in progress or completed, it can no longer be cancelled.",
  },
  {
    question: "Do I need to pay online?",
    answer:
      "Not yet — online payment is on our roadmap. For now, bookings are confirmed by the partner and payment happens directly with them.",
  },
  {
    question: "Which areas does GaadiGrid cover right now?",
    answer:
      "We're live in Noida, with real station listings and a small set of verified car wash and vehicle care partners. More cities and partners are coming as we grow.",
  },
];

export default function HelpPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Help &amp; Contact</h1>
        <p className="mt-3 text-muted-foreground">
          Questions about availability, a booking, or something else? Check the answers below, or send us a message.
        </p>

        <div className="mt-10 rounded-2xl border border-border bg-card px-6">
          <Accordion>
            {HELP_FAQS.map((faq, index) => (
              <AccordionItem key={faq.question} value={String(index)}>
                <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-foreground">Still stuck? Send us a message</h2>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
