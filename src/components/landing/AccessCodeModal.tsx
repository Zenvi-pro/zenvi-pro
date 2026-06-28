import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound } from "lucide-react";
import AccessCodeForm from "@/components/AccessCodeForm";
import { ACCESS_CODE_KEY } from "@/components/AccessCodeForm";
import { supabase } from "@/integrations/supabase/client";
import { clampCheckoutPathIfNeeded } from "@/lib/checkout-access";
import { clampPlanKeyToAllowedTier } from "@/lib/checkout-routing";
import { useToast } from "@/hooks/use-toast";

export { ACCESS_CODE_KEY };

interface AccessCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Which plan to route to after validation. Defaults to "pro_monthly". */
  planKey?: string;
}

const TIER_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  max: "Max",
};

function planTierFromKey(planKey: string): string | undefined {
  const map: Record<string, string> = {
    starter_monthly: "starter",
    starter_annual: "starter",
    pro_monthly: "pro",
    pro_annual: "pro",
    max_monthly: "max",
    max_annual: "max",
  };
  return map[planKey];
}

export default function AccessCodeModal({ isOpen, onClose, planKey = "pro_monthly" }: AccessCodeModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const planTier = planTierFromKey(planKey);

  async function navigateAfterCode(
    targetPlanKey: string,
    allowedTier?: string | null,
  ) {
    const clampedKey = clampPlanKeyToAllowedTier(targetPlanKey, allowedTier ?? null);
    const checkoutPath = await clampCheckoutPathIfNeeded(`/checkout?plan=${clampedKey}`, {
      skipIfPaid: true,
    });

    if (clampedKey !== targetPlanKey && allowedTier) {
      const label = TIER_LABEL[allowedTier] ?? allowedTier;
      toast({
        title: `Your invite is for ${label}`,
        description: `Continuing with the ${label} plan.`,
      });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate(checkoutPath);
    } else {
      navigate(`/login?next=${encodeURIComponent(checkoutPath)}`);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const { data: claimedToken } = await supabase.rpc("get_user_claimed_waitlist_token");
      if (cancelled || !claimedToken) return;

      sessionStorage.setItem(ACCESS_CODE_KEY, String(claimedToken));
      onClose();
      await navigateAfterCode(planKey);
    })();

    return () => { cancelled = true; };
  }, [isOpen, navigate, onClose, planKey]);

  const handleValidated = (_code: string, allowedTier?: string | null) => {
    onClose();
    void navigateAfterCode(planKey, allowedTier);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md pointer-events-auto"
            >
              <div className="relative rounded-xl border border-white/[0.06] bg-[#111111] p-8">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>

                <div className="w-11 h-11 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-center mb-5">
                  <KeyRound className="w-5 h-5 text-primary" />
                </div>

                <h2 className="text-xl font-semibold text-white mb-1">
                  Enter your access code
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Got an invite? Paste your access code below to get started with Zenvi.
                </p>

                <AccessCodeForm onValidated={handleValidated} planTier={planTier} />

                <p className="text-xs text-muted-foreground/60 text-center mt-4">
                  Don't have a code?{" "}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-primary hover:underline"
                  >
                    Join the waitlist
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
