import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ZenviLogo } from "@/components/ZenviLogo";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
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

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const state = searchParams.get("state");
  const next = searchParams.get("next");
  const isDesktop = !!state;

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [isVerifyStep, setIsVerifyStep] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "signup" && password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const result =
        authMode === "signin"
          ? await supabase.auth.signInWithPassword({
              email: email.trim().toLowerCase(),
              password,
            })
          : await supabase.auth.signUp({
              email: email.trim().toLowerCase(),
              password,
              options: { data: { desktop_state: state ?? null } },
            });

      const { data, error } = result;

      if (error) throw error;

      if (authMode === "signup" && data.user && !data.session) {
        setIsVerifyStep(true);
        return;
      }

      if (isDesktop && data.session && state) {
        await supabase.rpc("complete_desktop_auth_session", {
          session_state: state,
          p_access_token: data.session.access_token,
          p_refresh_token: data.session.refresh_token,
        });
        navigate("/auth/success");
      } else {
        navigate(next ?? "/");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : authMode === "signin"
            ? "Check your email and password."
            : "Could not create your account.";
      toast({
        title: authMode === "signin" ? "Sign in failed" : "Sign up failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    if (next) sessionStorage.setItem("auth_next", next);
    if (state) sessionStorage.setItem("auth_state", state);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setOauthLoading(null);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A0A0A] px-4 py-0 sm:px-6 sm:py-0 lg:px-0 lg:py-0">
      <Link
        to="/"
        className="absolute left-5 top-6 z-30 flex items-center gap-2 text-white/90 transition-opacity hover:opacity-85 md:hidden"
      >
        <ZenviLogo size={20} />
        <span className="text-base font-semibold tracking-tight">Zenvi</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <div className="flex min-h-screen w-full flex-col gap-5 lg:flex-row lg:gap-0">
          <Card className="group relative hidden min-h-[340px] w-full overflow-hidden rounded-2xl border-white/[0.08] bg-[#0B0B0B] md:block lg:min-h-full lg:w-[46%] lg:flex-none lg:min-w-0 lg:rounded-l-none lg:rounded-r-2xl">
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src="/eye_video.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/28 via-primary/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_28%,rgba(0,0,0,0.58)_70%,rgba(0,0,0,0.84)_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/55" />

            <Link
              to="/"
              className="absolute left-7 top-7 z-10 flex items-center gap-2.5 text-white/90 transition-opacity hover:opacity-85"
            >
              <ZenviLogo size={28} />
              <span className="text-xl font-semibold tracking-tight">Zenvi</span>
            </Link>

            <div className="absolute bottom-5 left-5 z-10 text-white">
              <p className="text-[1.85rem] font-semibold leading-tight tracking-tight transition-opacity duration-300 group-hover:opacity-0">
                Eyes on the edit.
              </p>
              <p className="mt-1 text-sm text-white/75 transition-opacity duration-300 group-hover:opacity-0">
                Zenvi sees the frame before you do.
              </p>
              <p className="pointer-events-none absolute left-0 top-0 text-[1.2rem] font-semibold leading-tight tracking-tight text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                A video taken by Jashan (Cofounder, Zenvi) in 2020
              </p>
            </div>
          </Card>

          <div className="relative box-border flex min-h-screen w-full flex-col items-center justify-center md:justify-start lg:w-[54%] lg:max-w-[54%] lg:flex-none lg:justify-center lg:px-6 xl:px-8">
            <FlickeringGrid
              className="z-0 opacity-45"
              squareSize={3}
              gridGap={24}
              color="0, 102, 255"
              maxOpacity={0.06}
              flickerChance={0.035}
              fps={10}
            />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-transparent via-white/[0.01] to-transparent" />
            <div className="fixed right-5 top-6 z-30 flex justify-end sm:right-7 lg:absolute lg:right-4 lg:top-6">
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  setIsVerifyStep(false);
                  setAuthMode((prev) => (prev === "signin" ? "signup" : "signin"));
                }}
                className="h-10 rounded-lg border-primary/35 bg-primary/10 px-4 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(0,102,255,0.2),0_6px_28px_rgba(0,102,255,0.2)] hover:bg-primary/20 hover:border-primary/55"
              >
                {authMode === "signin" ? "Sign up" : "Sign in"}
              </Button>
            </div>

            <div className="relative z-10 w-full max-w-[450px] py-24 md:py-10 lg:py-0">
              {isDesktop && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-center"
                >
                  <p className="text-xs font-medium tracking-wide text-primary">
                    {authMode === "signin"
                      ? "Signing in from the Zenvi app"
                      : "Creating account from the Zenvi app"}
                  </p>
                </motion.div>
              )}

              <div className="rounded-xl border border-transparent bg-transparent p-0 md:p-5">
                {isVerifyStep ? (
                  <div className="text-center py-2">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                      <CheckCircle className="h-7 w-7 text-primary" />
                    </div>
                    <h1 className="mb-2 text-[20px] font-semibold tracking-tight text-white">Check your inbox</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsVerifyStep(false);
                        setAuthMode("signin");
                      }}
                      className="mt-6 h-9 w-full border-white/[0.12] bg-white/[0.02] text-sm text-white hover:bg-white/[0.08]"
                    >
                      Back to sign in
                    </Button>
                  </div>
                ) : (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={authMode}
                      initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h1 className="mb-1 text-[20px] font-semibold tracking-tight text-white drop-shadow-[0_0_16px_rgba(0,102,255,0.22)]">
                        {authMode === "signin" ? "Welcome back" : "Create account"}
                      </h1>
                      <p className="mb-5 text-[13px] text-muted-foreground">
                        {authMode === "signin" ? "Sign in to continue editing." : "Get started with Zenvi today."}
                      </p>

                      <form onSubmit={handleSubmit} className="space-y-3">
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoFocus={isDesktop}
                          className="h-9 bg-white/[0.03] border-white/[0.07] focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 text-sm text-white placeholder:text-muted-foreground"
                        />
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={authMode === "signin" ? "Enter your password" : "Create a password (min 8 chars)"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={authMode === "signup" ? 8 : undefined}
                            className="h-9 bg-white/[0.03] border-white/[0.07] focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 text-sm text-white placeholder:text-muted-foreground pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="mt-1 h-9 w-full bg-white text-sm font-medium text-black hover:bg-white/90"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : authMode === "signin" ? (
                            "Continue"
                          ) : (
                            "Create account"
                          )}
                        </Button>
                      </form>

                      <div className="my-5 flex items-center gap-3">
                        <Separator className="bg-primary/20" />
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">or</span>
                        <Separator className="bg-primary/20" />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOAuth("github")}
                        disabled={!!oauthLoading}
                        className="h-9 w-full border-primary/25 bg-primary/[0.06] text-sm font-normal text-white hover:bg-primary/[0.12] gap-2.5"
                      >
                        {oauthLoading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                        Continue with GitHub
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOAuth("google")}
                        disabled={!!oauthLoading}
                        className="mt-2.5 h-9 w-full border-primary/25 bg-primary/[0.06] text-sm font-normal text-white hover:bg-primary/[0.12] gap-2.5"
                      >
                        {oauthLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                        Continue with Google
                      </Button>

                      <p className="mt-5 text-center text-xs text-muted-foreground/70">
                        {authMode === "signin" ? "Don’t have an account?" : "Already have an account?"}{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setIsVerifyStep(false);
                            setAuthMode((prev) => (prev === "signin" ? "signup" : "signin"));
                          }}
                          className="font-medium text-white hover:text-primary transition-colors"
                        >
                          {authMode === "signin" ? "Sign up" : "Sign in"}
                        </button>
                      </p>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
