import { Hero } from "@/components/sections/Hero";
import { SocialProof } from "@/components/sections/SocialProof";
import { WhyPresentHealth } from "@/components/sections/WhyPresentHealth";
import { WhatYouGet } from "@/components/sections/WhatYouGet";
import { HsaInfo } from "@/components/sections/HsaInfo";
import { PricingCards } from "@/components/sections/PricingCards";
import { Transparency } from "@/components/sections/Transparency";
import { FAQAccordion } from "@/components/sections/FAQAccordion";

export default function Home() {
  return (
    <>
      <Hero />
      <SocialProof />
      <WhyPresentHealth />
      <WhatYouGet />
      <HsaInfo />
      <PricingCards />
      <Transparency />
      <FAQAccordion />
    </>
  );
}
