import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIER_LABELS: Record<string, string> = {
  creator: "Creator",
  pro: "Pro",
  studio: "Studio",
};

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") ?? "pro";
  const tierLabel = TIER_LABELS[plan] ?? "Pro";

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
      {/* Wordmark */}
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
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-20 h-20 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mx-auto mb-7"
        >
          <CheckCircle className="w-9 h-9 text-primary" />
        </motion.div>

        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
          You're subscribed.
        </h1>
        <p className="text-muted-foreground text-base mb-10 leading-relaxed">
          Welcome to Zenvi{" "}
          <span className="text-white font-medium">{tierLabel}</span>. Your
          trial starts today — no charge for 14 days.
        </p>

        {/* Action cards */}
        <div className="space-y-3 mb-10">
          <Link to="/download">
            <div className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#111111] hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-200 p-5 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg border border-white/[0.07] flex items-center justify-center text-primary">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">
                    Download Zenvi
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get the desktop app for your platform
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>

          <a href="mailto:support@zenvi.app">
            <div className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0D0D0D] hover:border-white/[0.12] transition-all duration-200 p-5 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg border border-white/[0.06] flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">✉</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">
                    Get in touch
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    support@zenvi.app — we reply fast
                  </p>
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
