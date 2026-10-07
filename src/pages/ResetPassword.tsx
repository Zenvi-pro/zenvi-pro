import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ZenviLogo } from "@/components/ZenviLogo";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearRecoverySession, isRecoverySession } from "@/lib/auth-redirect";

async function passwordMatchesCurrent(email: string, password: string): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  return res.ok;
}

function isRecoveryUrl(): boolean {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  return (
    hash.get("type") === "recovery" ||
    query.get("type") === "recovery" ||
    !!query.get("code") ||
    !!hash.get("access_token")
  );
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const state = searchParams.get("state");
  const isDesktop = !!state;

  const [status, setStatus] = useState<"loading" | "ready" | "invalid" | "done">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [samePasswordError, setSamePasswordError] = useState(false);

  // Id of the user whose recovery link was verified; the form only ever updates that account.
  const recoveryUserId = useRef<string | null>(null);

  const loginPath = state ? `/login?state=${encodeURIComponent(state)}` : "/login";

  useEffect(() => {
    let settled = false;

    const markReady = (userId: string) => {
      if (settled) return;
      settled = true;
      recoveryUserId.current = userId;
      setStatus("ready");
    };

    const markInvalid = () => {
      if (settled) return;
      settled = true;
      setStatus("invalid");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        markReady(session.user.id);
        return;
      }
      // AuthCallback verifies the link and marks the session before redirecting here.
      // An ordinary signed-in session without that marker must not unlock the form.
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION") && isRecoverySession(session.user.id)) {
        markReady(session.user.id);
        return;
      }
      if (event === "INITIAL_SESSION" && !isRecoveryUrl()) {
        markInvalid();
      }
    });

    const timeout = window.setTimeout(() => {
      if (!settled) markInvalid();
    }, 8000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", description: "Re-enter the same password.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setSamePasswordError(false);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session || session.user.id !== recoveryUserId.current) {
        throw new Error("This reset link is invalid or has expired.");
      }

      const email = session.user.email;
      if (email && (await passwordMatchesCurrent(email, password))) {
        setSamePasswordError(true);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const text = error.message.toLowerCase();
        if (text.includes("same") || text.includes("different")) {
          setSamePasswordError(true);
          return;
        }
        throw error;
      }

      let { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) ({ error: signOutError } = await supabase.auth.signOut({ scope: "local" }));
      if (signOutError) {
        toast({
          title: "Password updated",
          description: "We could not sign you out. Close this tab, then sign in with your new password.",
          variant: "destructive",
        });
        return;
      }
      clearRecoverySession();
      setStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not update your password.";
      toast({ title: "Reset failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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
          </Card>

          <div className="relative box-border flex min-h-screen w-full flex-col items-center justify-center md:justify-start lg:w-[54%] lg:max-w-[54%] lg:flex-none lg:justify-center lg:px-6 xl:px-8">
            <FlickeringGrid
              className="z-0 opacity-65"
              squareSize={5}
              gridGap={22}
              color="180, 215, 255"
              maxOpacity={0.12}
              flickerChance={0.055}
              fps={0.5}
            />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-transparent via-white/[0.01] to-transparent" />

            <div className="relative z-10 w-full max-w-[450px] py-24 md:py-10 lg:py-0">
              <div className="rounded-xl border border-transparent bg-transparent p-0 md:p-5">
                {status === "loading" && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                {status === "invalid" && (
                  <div className="text-center py-2">
                    <h1 className="mb-2 text-[20px] font-semibold tracking-tight text-white">Link expired</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This reset link is invalid or has expired. Request a new one from sign in.
                    </p>
                    <Button
                      type="button"
                      onClick={() => navigate(loginPath, { replace: true })}
                      className="mt-6 h-9 w-full bg-white text-sm font-medium text-black hover:bg-white/90"
                    >
                      Back to sign in
                    </Button>
                  </div>
                )}

                {status === "done" && (
                  <div className="text-center py-2">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                      <CheckCircle className="h-7 w-7 text-primary" />
                    </div>
                    <h1 className="mb-2 text-[20px] font-semibold tracking-tight text-white">Password reset</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Sign in with your new password to continue.
                    </p>
                    <Button
                      type="button"
                      onClick={() => navigate(loginPath, { replace: true })}
                      className="mt-6 h-9 w-full bg-white text-sm font-medium text-black hover:bg-white/90"
                    >
                      Sign in
                    </Button>
                  </div>
                )}

                {status === "ready" && (
                  <>
                    <h1 className="mb-1 text-[20px] font-semibold tracking-tight text-white drop-shadow-[0_0_16px_rgba(0,102,255,0.22)]">
                      Choose a new password
                    </h1>
                    <p className="mb-5 text-[13px] text-muted-foreground">
                      {isDesktop ? "Then return to the Zenvi app." : "Use at least 8 characters."}
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="New password (min 8 chars)"
                          value={password}
                          onChange={(e) => {
                            setSamePasswordError(false);
                            setPassword(e.target.value);
                          }}
                          required
                          minLength={8}
                          autoFocus
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
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirm}
                        onChange={(e) => {
                          setSamePasswordError(false);
                          setConfirm(e.target.value);
                        }}
                        required
                        minLength={8}
                        className="h-9 bg-white/[0.03] border-white/[0.07] focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 text-sm text-white placeholder:text-muted-foreground"
                      />
                      {samePasswordError && (
                        <p className="text-[12px] text-destructive">
                          Choose a different password from the one you already use.
                        </p>
                      )}
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="mt-1 h-9 w-full bg-white text-sm font-medium text-black hover:bg-white/90"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
