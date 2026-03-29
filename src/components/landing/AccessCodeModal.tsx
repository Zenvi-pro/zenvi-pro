import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const ACCESS_CODE_KEY = "zenvi_access_code";

interface AccessCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Which plan to route to after validation. Defaults to "pro". */
  planKey?: string;
}

export default function AccessCodeModal({ isOpen, onClose, planKey = "pro" }: AccessCodeModalProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // If already logged in and already has a claimed code, skip straight to checkout.
  useEffect(() => {
    if (!isOpen) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: hasAccess } = await supabase.rpc("get_user_download_access");
      if (hasAccess) {
        onClose();
        navigate(`/checkout?plan=${planKey}`);
      }
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");

    try {
      // Validate the code (works for both anon and logged-in)
      const { data, error: rpcError } = await supabase.rpc("validate_waitlist_token", { token: trimmed });

      if (rpcError || !data || data.length === 0) {
        setError("Invalid or already used access code. Check your invite and try again.");
        return;
      }

      // Store the validated code so checkout can pick it up
      sessionStorage.setItem(ACCESS_CODE_KEY, trimmed);

      const { data: { session } } = await supabase.auth.getSession();
      onClose();

      if (session) {
        // Already logged in — send straight to checkout
        navigate(`/checkout?plan=${planKey}`);
      } else {
        // Not logged in — send to auth, then checkout
        navigate(`/login?next=${encodeURIComponent(`/checkout?plan=${planKey}`)}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setCode("");
      setError("");
    }, 200);
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

                <form onSubmit={handleSubmit} className="space-y-3">
                  <Input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setError(""); }}
                    required
                    autoFocus
                    className="h-11 bg-white/[0.03] border-white/[0.06] focus:border-primary text-white placeholder:text-muted-foreground/50 font-mono text-sm"
                  />

                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading || !code.trim()}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

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
