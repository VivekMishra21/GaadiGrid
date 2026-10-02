import { Header } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { QuickServiceSelector } from "@/components/site/quick-service-selector";
import { NearbyPreview } from "@/components/site/nearby-preview";
import { HowItWorks } from "@/components/site/how-it-works";
import { CarWashPreview } from "@/components/site/car-wash-preview";
import { WhyGaadiGrid } from "@/components/site/why-gaadigrid";
import { PartnerCta } from "@/components/site/partner-cta";
import { Faq } from "@/components/site/faq";
import { WaitlistSection } from "@/components/site/waitlist-section";
import { Footer } from "@/components/site/footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <QuickServiceSelector />
        <NearbyPreview />
        <HowItWorks />
        <CarWashPreview />
        <WhyGaadiGrid />
        <PartnerCta />
        <Faq />
        <WaitlistSection />
      </main>
      <Footer />
    </>
  );
}
