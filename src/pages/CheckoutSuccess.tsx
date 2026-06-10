import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Download, ChevronRight, Loader2 } from "lucide-react";
import { ACCESS_CODE_KEY, CHECKOUT_ACCESS_CODE_KEY } from "@/components/AccessCodeForm";
import { supabase } from "@/integrations/supabase/client";

// this is the checkout

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  starter_monthly: "Starter",
  starter_annual: "Starter",
  pro: "Pro",
  pro_monthly: "Pro",
  pro_annual: "Pro",
  max: "Max",
  max_monthly: "Max",
  max_annual: "Max",
  creator_monthly: "Starter",
  creator_annual: "Starter",
  studio_monthly: "Max",
  lifetime: "Lifetime Access",
};

const SUCCESS_HEADING: Record<string, string> = {
  starter_monthly: "Welcome to Zenvi Starter.",
  starter_annual: "Welcome to Zenvi Starter.",
  starter: "Welcome to Zenvi Starter.",
  pro_monthly: "Welcome to Zenvi Pro.",
  pro_annual: "Welcome to Zenvi Pro.",
  pro: "Welcome to Zenvi Pro.",
  max_monthly: "Welcome to Zenvi Max.",
  max_annual: "Welcome to Zenvi Max.",
  max: "Welcome to Zenvi Max.",
  creator_monthly: "Welcome to Zenvi Starter.",
  creator_annual: "Welcome to Zenvi Starter.",
  studio_monthly: "Welcome to Zenvi Max.",
  lifetime: "You're in. Forever.",
};

const SUCCESS_SUBTEXT: Record<string, string> = {
  starter_monthly: "Your AI video editor is ready.",
  starter_annual: "Your AI video editor is ready.",
  starter: "Your AI video editor is ready.",
  pro_monthly: "Professional-grade AI, unlocked.",
  pro_annual: "Professional-grade AI, unlocked.",
  pro: "Professional-grade AI, unlocked.",
  max_monthly: "Your team's AI video studio is ready.",
  max_annual: "Your team's AI video studio is ready.",
  max: "Your team's AI video studio is ready.",
  creator_monthly: "Your AI video editor is ready.",
  creator_annual: "Your AI video editor is ready.",
  studio_monthly: "Your team's AI video studio is ready.",
  lifetime: "One payment. No renewals. Ever.",
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") ?? "pro";
  const tierLabel = TIER_LABELS[plan] ?? "Pro";
  const [activating, setActivating] = useState(true);

  useEffect(() => {
    sessionStorage.removeItem(ACCESS_CODE_KEY);
    sessionStorage.removeItem(CHECKOUT_ACCESS_CODE_KEY);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function pollSubscription() {
      while (!cancelled && Date.now() - startedAt < POLL_TIMEOUT_MS) {
        const { data } = await supabase.rpc("get_user_subscription");
        if (data && data.length > 0) {
          if (!cancelled) {
            setActivating(false);
            navigate("/download", { replace: true });
          }
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!cancelled) setActivating(false);
    }

    void pollSubscription();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
      <div className="mb-12">
        <Link
          to="/"
          className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity"
        >
          Zenvi
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-20 h-20 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mx-auto mb-7"
        >
          <CheckCircle className="w-9 h-9 text-primary" />
        </motion.div>

        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
          {SUCCESS_HEADING[plan] ?? "You're all set."}
        </h1>
        <p className="text-muted-foreground text-base mb-10 leading-relaxed">
          {activating ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Activating your subscription…
            </span>
          ) : (
            SUCCESS_SUBTEXT[plan] ?? (
              <>
                Welcome to Zenvi{" "}
                <span className="text-white font-medium">{tierLabel}</span>.
                Your account is active and ready to use.
              </>
            )
          )}
        </p>

        <div className="space-y-3 mb-10">
          <Link to="/download">
            <div className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#111111] hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-200 p-5 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg border border-white/[0.07] flex items-center justify-center text-primary">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Download Zenvi</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get the desktop app for your platform
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>

          <Link to="/dashboard">
            <div className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0D0D0D] hover:border-white/[0.12] transition-all duration-200 p-5 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg border border-white/[0.06] flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">📊</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">View dashboard</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Usage, billing, and account settings
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          <a href="mailto:support@zenvi.pro">
            <div className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0D0D0D] hover:border-white/[0.12] transition-all duration-200 p-5 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg border border-white/[0.06] flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">✉</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Get in touch</p>
                  <p className="text-xs text-muted-foreground mt-0.5">support@zenvi.pro — we reply fast</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        </div>

        <p className="text-xs text-muted-foreground">
          A receipt has been sent to your email.{" "}
          <Link to="/" className="text-white hover:text-primary transition-colors">
            Back to site
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
