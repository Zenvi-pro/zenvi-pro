import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import IntegrationsBeam from "@/components/landing/IntegrationsBeam";
import EditorDemo from "@/components/landing/EditorDemo";
import Comparison from "@/components/landing/Comparison";
import Pricing from "@/components/landing/Pricing";
import LogoTicker from "@/components/landing/LogoTicker";
import Footer from "@/components/landing/Footer";
import WaitlistModal from "@/components/landing/WaitlistModal";
import AccessCodeModal from "@/components/landing/AccessCodeModal";
import { IntroOverlay } from "@/components/landing/IntroOverlay";
import { supabase } from "@/integrations/supabase/client";

const INTRO_STORAGE_KEY = "zenvi-intro-done";

const Index = () => {
  const navigate = useNavigate();
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [accessCodePlanKey, setAccessCodePlanKey] = useState<string>("pro");
  const [isAccessCodeOpen, setIsAccessCodeOpen] = useState(false);
  const [heroRevealReady, setHeroRevealReady] = useState(false);
  const [introVisible, setIntroVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem(INTRO_STORAGE_KEY);
  });

  const openWaitlist = () => setIsWaitlistOpen(true);
  const closeWaitlist = () => setIsWaitlistOpen(false);

  const openAccessCode = (planKey?: string) => {
    setAccessCodePlanKey(planKey ?? "pro");
    setIsAccessCodeOpen(true);
  };

  // Hero "Download" button: if user has an active sub → go to /download,
  // otherwise scroll to pricing so they can pick a plan.
  const handleHeroDownload = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: sub } = await supabase.rpc("get_user_subscription");
      if (sub && sub.length > 0) {
        navigate("/download");
        return;
      }
    }
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

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
      <Navbar onOpenWaitlist={openWaitlist} onOpenAccessCode={handleHeroDownload} />
      <Hero onOpenAccessCode={handleHeroDownload} onRevealSequenceComplete={() => setHeroRevealReady(true)} />
      <EditorDemo readyToPop={heroRevealReady} />
      <Features />
      <IntegrationsBeam />
      <Comparison />
      <Pricing onOpenAccessCode={openAccessCode} />
      <LogoTicker />
      <Footer />
      <WaitlistModal isOpen={isWaitlistOpen} onClose={closeWaitlist} />
      <AccessCodeModal
        isOpen={isAccessCodeOpen}
        onClose={() => setIsAccessCodeOpen(false)}
        planKey={accessCodePlanKey}
      />
    </div>
  );
};

export default Index;
