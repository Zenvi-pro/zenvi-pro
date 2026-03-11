import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const state = searchParams.get("state");
  const next = searchParams.get("next");
  const isDesktop = !!state;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyStep, setIsVerifyStep] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // Pass state in metadata so the email confirmation link can hand it back
          data: { desktop_state: state ?? null },
        },
      });

      if (error) throw error;

      // Supabase sends a confirmation email — show verify step
      if (data.user && !data.session) {
        setIsVerifyStep(true);
      } else if (data.session) {
        // Email confirmation is off — auto sign-in
        if (isDesktop && state) {
          await supabase.rpc("complete_desktop_auth_session", {
            session_state: state,
            p_access_token: data.session.access_token,
            p_refresh_token: data.session.refresh_token,
          });
          navigate("/auth/success");
        } else {
          navigate(next ?? "/");
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      toast({
        title: "Sign up failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifyStep) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm text-center"
        >
          <div className="text-center mb-8">
            <Link
              to="/"
              className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity"
            >
              Zenvi
            </Link>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-10">
            <div className="w-14 h-14 rounded-full border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              Check your inbox
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="text-white font-medium">{email}</span>. Click it
              to activate your account.
            </p>
            {isDesktop && (
              <p className="text-xs text-muted-foreground mt-4 border-t border-white/[0.06] pt-4">
                After confirming, return to this window and sign in to connect
                your Zenvi app.
              </p>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              to={`/login${state ? `?state=${state}` : ""}`}
              className="text-white hover:text-primary transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity"
          >
            Zenvi
          </Link>
        </div>

        {/* Desktop context pill */}
        {isDesktop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-4 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-center"
          >
            <p className="text-xs text-primary font-medium tracking-wide">
              Creating account from the Zenvi app
            </p>
          </motion.div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-8">
          <h1 className="text-[22px] font-semibold text-white mb-1 tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground mb-7">
            Get early access to Zenvi
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-11 bg-white/[0.03] border-white/[0.07] focus:border-primary text-white placeholder:text-muted-foreground"
            />

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-11 bg-white/[0.03] border-white/[0.07] focus:border-primary text-white placeholder:text-muted-foreground pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium mt-1"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground/60 text-center mt-5 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link
            to={`/login${state ? `?state=${state}` : ""}`}
            className="text-white hover:text-primary transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
