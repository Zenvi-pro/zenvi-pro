import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCESS_CODE_KEY } from "@/components/landing/AccessCodeModal";

// this is the checkout

const TIER_LABELS: Record<string, string> = {
  creator: "Creator",
  creator_monthly: "Creator",
  creator_annual: "Creator",
  pro: "Pro",
  pro_monthly: "Pro",
  pro_annual: "Pro",
  studio: "Studio",
  studio_monthly: "Studio",
  lifetime: "Lifetime Access",
};

const SUCCESS_HEADING: Record<string, string> = {
  lifetime: "You're in. Forever.",
  creator_monthly: "Welcome to Zenvi Creator.",
  creator_annual: "Welcome to Zenvi Creator.",
  creator: "Welcome to Zenvi Creator.",
  pro_monthly: "Welcome to Zenvi Pro.",
  pro_annual: "Welcome to Zenvi Pro.",
  pro: "Welcome to Zenvi Pro.",
  studio_monthly: "Welcome to the Studio.",
  studio: "Welcome to the Studio.",
};

const SUCCESS_SUBTEXT: Record<string, string> = {
  lifetime: "One payment. No renewals. Ever.",
  creator_monthly: "Your AI video editor is ready.",
  creator_annual: "Your AI video editor is ready.",
  creator: "Your AI video editor is ready.",
  pro_monthly: "Professional-grade AI, unlocked.",
  pro_annual: "Professional-grade AI, unlocked.",
  pro: "Professional-grade AI, unlocked.",
  studio_monthly: "Your team's AI video studio is ready.",
  studio: "Your team's AI video studio is ready.",
};

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") ?? "pro";
  const tierLabel = TIER_LABELS[plan] ?? "Pro";

  // Clear the access code from storage once payment is confirmed
  useEffect(() => {
    sessionStorage.removeItem(ACCESS_CODE_KEY);
  }, []);

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
          {SUCCESS_SUBTEXT[plan] ?? (
            <>
              Welcome to Zenvi{" "}
              <span className="text-white font-medium">{tierLabel}</span>.
              Your account is active and ready to use.
            </>
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
