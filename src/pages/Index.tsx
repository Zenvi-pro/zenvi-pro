import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const [accessCodePlanKey, setAccessCodePlanKey] = useState<string>("pro");
  const [isAccessCodeOpen, setIsAccessCodeOpen] = useState(false);
  const [introVisible, setIntroVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem(INTRO_STORAGE_KEY);
  });

  // When navigating in with a hash (e.g. /pricing → /#features), scroll to the target
  // once the intro overlay is gone and the section has mounted.
  useEffect(() => {
    if (!location.hash || introVisible) return;
    const id = location.hash.slice(1);
    // Defer one frame so the section is in the DOM and the layout has settled.
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [location.hash, introVisible]);

  // Signup CTAs route internally so the post-auth redirect to /dashboard/download works.
  const openWaitlist = () => {
    navigate("/login?mode=signup");
  };

  const openAccessCode = (planKey?: string) => {
    setAccessCodePlanKey(planKey ?? "pro");
    setIsAccessCodeOpen(true);
  };

  const handleHeroDownload = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard/download");
      return;
    }
    navigate("/login?mode=signup");
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
