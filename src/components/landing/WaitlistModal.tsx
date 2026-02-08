import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WaitlistModal = ({ isOpen, onClose }: WaitlistModalProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("waitlist")
        .insert({ email: email.toLowerCase().trim() });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already on the list",
            description: "This email is already registered for early access.",
          });
        } else {
          throw error;
        }
      } else {
        setIsSuccess(true);
        toast({
          title: "You're on the list",
          description: "We'll notify you when Zenvi is ready.",
        });
      }
    } catch (error) {
      console.error("Waitlist error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setEmail("");
      setIsSuccess(false);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-8">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {!isSuccess ? (
                <>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Get early access
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Join the waitlist. We'll notify you the moment the beta
                    opens — no spam.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 bg-white/[0.03] border-white/[0.06] focus:border-primary text-white placeholder:text-muted-foreground"
                    />
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Join Waitlist
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

                  <p className="text-xs text-muted-foreground/60 text-center mt-4">
                    Your data stays with you — just like your videos will.
                  </p>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-14 h-14 rounded-full border border-primary/20 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    You're on the list
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Expect an invite in your inbox soon.
                  </p>
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="border-white/[0.06] hover:bg-white/5 text-white"
                  >
                    Close
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WaitlistModal;
