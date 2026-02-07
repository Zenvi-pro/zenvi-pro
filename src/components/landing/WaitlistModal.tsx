import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, CheckCircle, Loader2 } from "lucide-react";
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
          // Unique constraint violation - email already exists
          toast({
            title: "Already on the list!",
            description: "This email is already registered for early access.",
          });
        } else {
          throw error;
        }
      } else {
        setIsSuccess(true);
        toast({
          title: "You're on the list! 🎉",
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
    // Reset state after animation completes
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
              {/* Glow effects */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="relative z-10">
                {!isSuccess ? (
                  <>
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl gradient-purple-green flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="w-8 h-8 text-primary-foreground" />
                    </div>

                    {/* Content */}
                    <h2 className="text-2xl font-bold text-center mb-2">
                      Be First to Edit Smarter
                    </h2>
                    <p className="text-muted-foreground text-center mb-8">
                      Join 2,000+ creators waiting for Zenvi. We'll notify you the moment early access opens—no spam, ever.
                    </p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 bg-muted/50 border-border focus:border-primary"
                      />
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 neon-button text-primary-foreground"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Join Waitlist
                          </>
                        )}
                      </Button>
                    </form>

                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Your data stays with you—just like your videos will. Unsubscribe anytime.
                    </p>
                  </>
                ) : (
                  /* Success state */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring" }}
                      className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6"
                    >
                      <CheckCircle className="w-10 h-10 text-secondary" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-2">Welcome to the Future</h2>
                    <p className="text-muted-foreground mb-6">
                      You're on the list. Expect an invite in your inbox soon—get ready to edit smarter.
                    </p>
                    <Button
                      onClick={handleClose}
                      variant="outline"
                      className="border-border hover:border-primary/50"
                    >
                      Close
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WaitlistModal;
