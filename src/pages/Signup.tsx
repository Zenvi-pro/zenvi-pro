import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

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
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { desktop_state: state ?? null } },
      });

      if (error) throw error;

      if (data.user && !data.session) {
        setIsVerifyStep(true);
      } else if (data.session) {
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
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      toast({ title: "Sign up failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "github" | "google") => {
    setOauthLoading(provider);
    if (next) sessionStorage.setItem("auth_next", next);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setOauthLoading(null);
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
            <Link to="/" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
              Zenvi
            </Link>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-10">
            <div className="w-14 h-14 rounded-full border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Check your inbox</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="text-white font-medium">{email}</span>. Click it to activate your account.
            </p>
            {isDesktop && (
              <p className="text-xs text-muted-foreground mt-4 border-t border-white/[0.06] pt-4">
                After confirming, return to this window and sign in to connect your Zenvi app.
              </p>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to={`/login${state ? `?state=${state}` : ""}`} className="text-white hover:text-primary transition-colors font-medium">
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
          <Link to="/" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
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

          {/* OAuth buttons — only shown for web flow */}
          {!isDesktop && (
            <div className="space-y-2.5 mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth("github")}
                disabled={!!oauthLoading}
                className="w-full h-11 border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.05] text-white font-normal gap-2.5"
              >
                {oauthLoading === "github" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                Continue with GitHub
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth("google")}
                disabled={!!oauthLoading}
                className="w-full h-11 border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.05] text-white font-normal gap-2.5"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-xs text-muted-foreground/50">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={isDesktop}
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
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium mt-1"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground/60 text-center mt-5 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link
            to={`/login${state ? `?state=${state}` : next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-white hover:text-primary transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
