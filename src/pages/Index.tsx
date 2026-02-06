import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import EditorDemo from "@/components/landing/EditorDemo";
import WhyLocalAI from "@/components/landing/WhyLocalAI";
import Pricing from "@/components/landing/Pricing";
import Testimonials from "@/components/landing/Testimonials";
import Footer from "@/components/landing/Footer";
import WaitlistModal from "@/components/landing/WaitlistModal";

const Index = () => {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const openWaitlist = () => setIsWaitlistOpen(true);
  const closeWaitlist = () => setIsWaitlistOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onOpenWaitlist={openWaitlist} />
      <Hero onOpenWaitlist={openWaitlist} />
      <Features />
      <EditorDemo />
      <WhyLocalAI />
      <Pricing onOpenWaitlist={openWaitlist} />
      <Testimonials />
      <Footer />
      <WaitlistModal isOpen={isWaitlistOpen} onClose={closeWaitlist} />
    </div>
  );
};

export default Index;
