import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ACCESS_CODE_KEY } from "@/components/landing/AccessCodeModal";

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
  lifetime: {
    name: "Lifetime Access",
    price: "$100",
    period: "one-time",
    description: "Pay once. Yours forever. No subscription, no renewals.",
    features: [
      "Everything in Studio",
      "Lifetime access — no subscription ever",
      "All future updates included",
      "5 team seats",
      "Commercial usage rights",
      "Priority support, always",
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;
type Status = "checking-auth" | "no-code" | "ready" | "redirecting" | "error";

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const planKey = (searchParams.get("plan") ?? "pro") as PlanKey;
  const plan = PLANS[planKey] ?? PLANS.pro;

  const [status, setStatus] = useState<Status>("checking-auth");
  const [errorMsg, setErrorMsg] = useState("");
  const [accessCode, setAccessCode] = useState<string | null>(null);

  useEffect(() => {
    const redirectToLogin = () =>
      navigate(`/login?next=${encodeURIComponent(`/checkout?plan=${planKey}`)}`);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        redirectToLogin();
        return;
      }

      // Refresh token if close to expiry
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at != null && session.expires_at <= now + 60) {
        const { error } = await supabase.auth.refreshSession();
        if (error) { redirectToLogin(); return; }
      }

      // Check for access code in sessionStorage
      const storedCode = sessionStorage.getItem(ACCESS_CODE_KEY);

      if (storedCode) {
        setAccessCode(storedCode);
        setStatus("ready");
        return;
      }

      // No code in storage — check if user already has a claimed access token
      const { data: hasAccess } = await supabase.rpc("get_user_download_access");
      if (hasAccess) {
        setStatus("ready");
        return;
      }

      // No code, no prior access — send them back to get a code
      setStatus("no-code");
    }).catch(redirectToLogin);
  }, [navigate, planKey]);

  async function handleCheckout() {
    setStatus("redirecting");
    const loginUrl = `/login?next=${encodeURIComponent(`/checkout?plan=${planKey}`)}`;

    try {
      let { data: { session } } = await supabase.auth.getSession();

      if (!session) { navigate(loginUrl); return; }

      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at != null && session.expires_at <= now + 60) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session) {
          await supabase.auth.signOut();
          navigate(loginUrl);
          return;
        }
        session = refreshed.session;
      }

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
            accessCode: accessCode ?? undefined,
            successUrl: `${window.location.origin}/checkout/success?plan=${planKey}`,
            cancelUrl: `${window.location.origin}/#pricing`,
          }),
        },
      );

      const payload = await res.json().catch(() => ({}));

      if (res.status === 401) {
        await supabase.auth.signOut();
        navigate(loginUrl);
        return;
      }

      if (!res.ok) throw new Error(payload?.error ?? `Request failed (HTTP ${res.status})`);
      if (!payload?.url) throw new Error("No checkout URL returned.");

      window.location.href = payload.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not start checkout.";
      setErrorMsg(msg);
      setStatus("error");
      toast({ title: "Checkout failed", description: msg, variant: "destructive" });
    }
  }

  if (status === "checking-auth") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (status === "no-code") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="w-12 h-12 rounded-xl border border-white/[0.07] bg-[#111] flex items-center justify-center mx-auto mb-5">
            <KeyRound className="w-5 h-5 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access code required</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Zenvi is invite-only during beta. You need a valid access code to subscribe.
          </p>
          <Button
            onClick={() => navigate("/#pricing")}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Back to pricing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <nav className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-white tracking-tight">Zenvi</Link>
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
          <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-8 mb-4">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Selected plan</p>
                <h1 className="text-2xl font-bold text-white">Zenvi {plan.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>
              </div>
            </div>

            <ul className="space-y-2.5 mb-8 border-t border-white/[0.06] pt-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-white/70">{f}</span>
                </li>
              ))}
            </ul>

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
              <p className="text-xs text-destructive text-center mt-3">{errorMsg}</p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secured by Stripe · No card stored on Zenvi servers
          </div>
        </motion.div>
      </main>
    </div>
  );
}
