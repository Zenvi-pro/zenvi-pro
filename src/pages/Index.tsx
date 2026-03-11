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

const Index = () => {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const openWaitlist = () => setIsWaitlistOpen(true);
  const closeWaitlist = () => setIsWaitlistOpen(false);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
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
