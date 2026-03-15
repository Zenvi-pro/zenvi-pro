import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Plan definitions (mirrors Pricing.tsx) ─────────────────────────────────────
const PLANS = {
  creator: {
    name: "Creator",
    price: "$29",
    period: "/mo",
    description: "Everything indie creators need to level up their content.",
    features: [
      "Unlimited local AI processing",
      "Auto-generated subtitles (50+ languages)",
      "Smart scene detection & clipping",
      "1080p & 4K export",
      "Background noise removal",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "For professionals who demand speed and flexibility.",
    features: [
      "Everything in Creator",
      "Batch processing for multi-project workflows",
      "Advanced audio sweetening & EQ",
      "Custom export presets & platform profiles",
      "Priority feature requests",
      "Priority support",
    ],
  },
  studio: {
    name: "Studio",
    price: "$99",
    period: "/mo",
    description: "For teams and agencies with demanding pipelines.",
    features: [
      "Everything in Pro",
      "Team license (up to 5 seats)",
      "Dedicated Slack support",
      "Custom model fine-tuning",
      "Commercial usage rights",
      "SLA guarantee",
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;

type Status = "checking-auth" | "ready" | "redirecting" | "error";

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const planKey = (searchParams.get("plan") ?? "pro") as PlanKey;
  const plan = PLANS[planKey] ?? PLANS.pro;

  const [status, setStatus] = useState<Status>("checking-auth");
  const [errorMsg, setErrorMsg] = useState("");

  // Auth guard
  useEffect(() => {
    const redirectToLogin = () =>
      navigate(`/login?next=${encodeURIComponent(`/checkout?plan=${planKey}`)}`);

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!session) {
          redirectToLogin();
          return;
        }
        // If the access token is expired (or within 60s of expiry), refresh it
        // so functions.invoke() sends a valid token
        const now = Math.floor(Date.now() / 1000);
        const isExpired = session.expires_at != null && session.expires_at <= now + 60;
        if (isExpired) {
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            redirectToLogin();
            return;
          }
        }
        setStatus("ready");
      })
      .catch(redirectToLogin);
  }, [navigate, planKey]);

  async function handleCheckout() {
    setStatus("redirecting");
    const loginUrl = `/login?next=${encodeURIComponent(`/checkout?plan=${planKey}`)}`;

    try {
      // Get session, refreshing the access token if it's expired or close to expiry.
      let { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate(loginUrl);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at != null && session.expires_at <= now + 60) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session) {
          // Refresh token is invalid/not found — clear the stale session and re-login
          await supabase.auth.signOut();
          navigate(loginUrl);
          return;
        }
        session = refreshed.session;
      }

      // Call the edge function directly with fetch so we have guaranteed control
      // over the Authorization header. supabase.functions.invoke() can override
      // custom headers with its own cached token, which may still be stale.
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan: planKey,
            successUrl: `${window.location.origin}/checkout/success?plan=${planKey}`,
            cancelUrl: `${window.location.origin}/#pricing`,
          }),
        },
      );

      const payload = await res.json().catch(() => ({}));

      if (res.status === 401) {
        // The access token was rejected server-side (stale/invalidated session).
        // Clear it and send the user to re-login to get fresh tokens.
        await supabase.auth.signOut();
        navigate(loginUrl);
        return;
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? `Request failed (HTTP ${res.status})`);
      }

      if (!payload?.url) throw new Error("No checkout URL returned.");

      window.location.href = payload.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not start checkout.";
      console.error("Checkout error:", msg);
      setErrorMsg(msg);
      setStatus("error");
      toast({ title: "Checkout failed", description: msg, variant: "destructive" });
    }
  }

  // Loading / auth-check
  if (status === "checking-auth") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Minimal nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-white tracking-tight">
            Zenvi
          </Link>
          <Link
            to="/#pricing"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to pricing
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Plan summary card */}
          <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-8 mb-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Selected plan
                </p>
                <h1 className="text-2xl font-bold text-white">
                  Zenvi {plan.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white">
                  {plan.price}
                </span>
                <span className="text-muted-foreground text-sm">
                  {plan.period}
                </span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-2.5 mb-8 border-t border-white/[0.06] pt-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-white/70">{f}</span>
                </li>
              ))}
            </ul>

            {/* Trial note */}
            <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 mb-6 text-center">
              <p className="text-xs text-primary font-medium">
                14-day free trial included — cancel anytime
              </p>
            </div>

            {/* CTA */}
            <Button
              onClick={handleCheckout}
              disabled={status === "redirecting"}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium text-sm"
            >
              {status === "redirecting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Redirecting to payment…
                </>
              ) : (
                "Continue to payment"
              )}
            </Button>

            {status === "error" && (
              <p className="text-xs text-destructive text-center mt-3">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Security note */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secured by Stripe · No card stored on Zenvi servers
          </div>
        </motion.div>
      </main>
    </div>
  );
}
