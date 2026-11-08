import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Marquee } from "@/components/landing/Marquee";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { NearYou } from "@/components/landing/NearYou";
import { Events } from "@/components/landing/Events";
import { ForEveryone } from "@/components/landing/ForEveryone";
import { Trust } from "@/components/landing/Trust";
import { Faq } from "@/components/landing/Faq";
import { CtaBand } from "@/components/landing/CtaBand";
import { Footer } from "@/components/landing/Footer";
import { SmoothScroll } from "@/components/landing/SmoothScroll";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <HowItWorks />
        <NearYou />
        <Events />
        <ForEveryone />
        <Trust />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
