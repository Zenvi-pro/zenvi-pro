import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface AccessCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccessCodeModal({ isOpen, onClose }: AccessCodeModalProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "validate_waitlist_token",
        { token: trimmed },
      );

      if (rpcError || !data || data.length === 0) {
        setError("Invalid access code. Check your invite email and try again.");
        return;
      }

      // Valid token — navigate to download page
      onClose();
      navigate(`/download?token=${encodeURIComponent(trimmed)}`);
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

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-8">
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
                Got an invite? Paste your access code below to download Zenvi Beta.
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
                      Access Download
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
        </>
      )}
    </AnimatePresence>
  );
}
