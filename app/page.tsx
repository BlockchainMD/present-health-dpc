import { Hero } from "@/components/sections/Hero";
import { WhatYouGet } from "@/components/sections/WhatYouGet";
import { Comparison } from "@/components/sections/Comparison";
import { PhysicianPromise } from "@/components/sections/PhysicianPromise";
import { PricingCards } from "@/components/sections/PricingCards";

export default function Home() {
  return (
    <>
      <Hero />
      <WhatYouGet />
      <Comparison />
      <PhysicianPromise />
      <PricingCards />
    </>
  );
}
