import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ?state = desktop app OAuth flow; ?next = post-login redirect (web)
  const state = searchParams.get("state");
  const next = searchParams.get("next");
  const isDesktop = !!state;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      if (isDesktop && data.session && state) {
        // Store the session so the desktop app can poll for it
        await supabase.rpc("complete_desktop_auth_session", {
          session_state: state,
          p_access_token: data.session.access_token,
          p_refresh_token: data.session.refresh_token,
        });
        navigate("/auth/success");
      } else {
        // Regular web login — honour ?next redirect, else home
        navigate(next ?? "/");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Check your email and password.";
      toast({
        title: "Sign in failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              Signing in from the Zenvi app
            </p>
          </motion.div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-8">
          <h1 className="text-[22px] font-semibold text-white mb-1 tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mb-7">
            Sign in to your Zenvi account
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-11 bg-white/[0.03] border-white/[0.07] focus:border-primary text-white placeholder:text-muted-foreground"
            />

            {/* Password */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium mt-1"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          {/* Forgot password */}
          <div className="mt-5 text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-white transition-colors"
              onClick={() =>
                toast({
                  title: "Coming soon",
                  description: "Password reset will be available shortly.",
                })
              }
            >
              Forgot password?
            </button>
          </div>
        </div>

        {/* Switch to sign-up */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link
            to={`/signup${state ? `?state=${state}` : next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-white hover:text-primary transition-colors font-medium"
          >
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
