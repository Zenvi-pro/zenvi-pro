import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import FloraHero from "@/components/landing/FloraHero";
import FloraFeatures from "@/components/landing/FloraFeatures";
import FloraWorkflows from "@/components/landing/FloraWorkflows";
import FloraModels from "@/components/landing/FloraModels";
import Footer from "@/components/landing/Footer";
import AccessCodeModal from "@/components/landing/AccessCodeModal";
import { IntroOverlay } from "@/components/landing/IntroOverlay";
import { supabase } from "@/integrations/supabase/client";

const INTRO_STORAGE_KEY = "zenvi-intro-done";

const Index = () => {
  const navigate = useNavigate();
  const [accessCodePlanKey, setAccessCodePlanKey] = useState<string>("pro");
  const [isAccessCodeOpen, setIsAccessCodeOpen] = useState(false);
  const [introVisible, setIntroVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem(INTRO_STORAGE_KEY);
  });

  // Signup CTAs link out to https://zenvi.pro/login?mode=signup directly — no in-page modal.
  const openWaitlist = () => {
    window.location.href = "https://zenvi.pro/login?mode=signup";
  };

  const openAccessCode = (planKey?: string) => {
    setAccessCodePlanKey(planKey ?? "pro");
    setIsAccessCodeOpen(true);
  };

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
    <div className="min-h-screen bg-black">
      {introVisible && <IntroOverlay onComplete={handleIntroComplete} />}
      <Navbar onOpenWaitlist={openWaitlist} onOpenAccessCode={handleHeroDownload} />
      <FloraHero onOpenWaitlist={openWaitlist} />
      <FloraFeatures />
      <FloraWorkflows />
      <FloraModels />
      <Footer />
      <AccessCodeModal
        isOpen={isAccessCodeOpen}
        onClose={() => setIsAccessCodeOpen(false)}
        planKey={accessCodePlanKey}
      />
    </div>
  );
};

export default Index;
