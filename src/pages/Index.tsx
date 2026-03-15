import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import EditorDemo from "@/components/landing/EditorDemo";
import Comparison from "@/components/landing/Comparison";
import Pricing from "@/components/landing/Pricing";
import LogoTicker from "@/components/landing/LogoTicker";
import Footer from "@/components/landing/Footer";
import WaitlistModal from "@/components/landing/WaitlistModal";
import { IntroOverlay } from "@/components/landing/IntroOverlay";

const INTRO_STORAGE_KEY = "zenvi-intro-done";

const Index = () => {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [introVisible, setIntroVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem(INTRO_STORAGE_KEY);
  });

  const openWaitlist = () => setIsWaitlistOpen(true);
  const closeWaitlist = () => setIsWaitlistOpen(false);
  const handleIntroComplete = () => {
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setIntroVisible(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {introVisible && <IntroOverlay onComplete={handleIntroComplete} />}
      <Navbar onOpenWaitlist={openWaitlist} />
      <Hero onOpenWaitlist={openWaitlist} />
      <Features />
      <EditorDemo />
      <Comparison />
      <Pricing />
      <LogoTicker />
      <Footer />
      <WaitlistModal isOpen={isWaitlistOpen} onClose={closeWaitlist} />
    </div>
  );
};

export default Index;
