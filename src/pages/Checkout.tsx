import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ACCESS_CODE_KEY } from "@/components/landing/AccessCodeModal";

const PLANS = {
  // ── Canonical post-rename plans ───────────────────────────────────────────
  starter_monthly: {
    name: "Starter",
    price: "$29",
    period: "/mo",
    tier: "starter",
    interval: "monthly",
    description: "Your AI video editor, always on.",
    features: [
      "2,500 credits/month (~$25 of AI usage)",
      "≈ 50 AI clips OR 2,500 chats OR 60 min indexing",
      "1 seat",
      "All cloud LLMs (light / standard / premium)",
      "All Kling video models including 2.0",
      "TwelveLabs clip indexing + smart search",
      "1-month credit rollover",
      "Overage opt-in (1.5× sticker, $50 cap)",
      "No watermark",
    ],
  },
  starter_annual: {
    name: "Starter (Annual)",
    price: "$300",
    period: "/yr",
    tier: "starter",
    interval: "annual",
    displayPrice: "$25",
    displayPeriod: "/mo",
    description: "Your AI video editor, always on. Billed as $300/yr (save 14%).",
    features: [
      "3,000 credits/month (annual bonus)",
      "1 seat",
      "All cloud LLMs (light / standard / premium)",
      "All Kling video models including 2.0",
      "TwelveLabs clip indexing + smart search",
      "1-month credit rollover",
      "No watermark",
    ],
  },
  pro_monthly: {
    name: "Pro",
    price: "$49",
    period: "/mo",
    tier: "pro",
    interval: "monthly",
    description: "Studio-ready power, pooled across your team.",
    features: [
      "5,500 credits/month (~$55 of AI usage)",
      "≈ 110 AI clips OR 5,500 chats OR 250 min indexing",
      "3 pooled seats",
      "Everything in Starter",
      "Priority Runware queue at peak",
      "Per-seat usage analytics",
      "2-month credit rollover",
      "Overage opt-in (1.3× sticker, $150 cap)",
    ],
  },
  pro_annual: {
    name: "Pro (Annual)",
    price: "$468",
    period: "/yr",
    tier: "pro",
    interval: "annual",
    displayPrice: "$39",
    displayPeriod: "/mo",
    description: "Studio-ready power, pooled across your team. Billed as $468/yr (save 20%).",
    features: [
      "6,600 credits/month (annual bonus)",
      "3 pooled seats",
      "Everything in Starter",
      "Priority Runware queue at peak",
      "Per-seat usage analytics",
      "2-month credit rollover",
    ],
  },
  max_monthly: {
    name: "Max",
    price: "$199",
    period: "/mo",
    tier: "max",
    interval: "monthly",
    description: "One pool. Eight editors. Unlimited creativity.",
    features: [
      "25,000 credits/month (~$250 of AI usage)",
      "≈ 500 AI clips OR 25k chats OR 1,600 min indexing",
      "8 pooled seats",
      "Everything in Pro",
      "Priority Runware queue 24/7",
      "3-month credit rollover",
      "Overage opt-in (1.2× sticker, $500 cap)",
      "Custom voices (3/org)",
      "Beta access to new models",
    ],
  },
  max_annual: {
    name: "Max (Annual)",
    price: "$1,788",
    period: "/yr",
    tier: "max",
    interval: "annual",
    displayPrice: "$149",
    displayPeriod: "/mo",
    description: "One pool. Eight editors. Unlimited creativity. Billed as $1,788/yr (save 25%).",
    features: [
      "30,000 credits/month (annual bonus)",
      "8 pooled seats",
      "Everything in Pro",
      "Priority Runware queue 24/7",
      "3-month credit rollover",
      "Custom voices (3/org)",
    ],
  },
  lifetime: {
    name: "Lifetime Access",
    price: "$99",
    period: "one-time",
    tier: "lifetime",
    interval: "once",
    description: "Pay once. Create forever.",
    features: [
      "1,000 credits every month, forever",
      "Credits accumulate up to 1,500",
      "One payment, no renewals, ever",
      "Top-up credit packs available for heavy months",
      "Locked in at today's price — forever",
    ],
  },
  // ── Legacy plan keys (old links from email, social, in-flight clients) ───
  // Aliased onto canonical tiers so /checkout?plan=creator_monthly still
  // works through the rename window.
  creator_monthly: {
    name: "Starter",
    price: "$29",
    period: "/mo",
    tier: "starter",
    interval: "monthly",
    description: "Your AI video editor, always on.",
    features: [
      "2,500 credits/month (~$25 of AI usage)",
      "1 seat",
      "All cloud LLMs + Kling video + indexing",
      "1-month credit rollover",
    ],
  },
  creator_annual: {
    name: "Starter (Annual)",
    price: "$300",
    period: "/yr",
    tier: "starter",
    interval: "annual",
    displayPrice: "$25",
    displayPeriod: "/mo",
    description: "Your AI video editor, always on. Billed as $300/yr.",
    features: [
      "3,000 credits/month (annual bonus)",
      "1 seat",
      "All cloud LLMs + Kling video + indexing",
    ],
  },
  studio_monthly: {
    name: "Max",
    price: "$199",
    period: "/mo",
    tier: "max",
    interval: "monthly",
    description: "One pool. Eight editors. Unlimited creativity.",
    features: [
      "25,000 credits/month (~$250 of AI usage)",
      "8 pooled seats",
      "Everything in Pro + priority 24/7",
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;
type Status = "checking-auth" | "no-code" | "ready" | "redirecting" | "error" | "upgrading";

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const planKey = (searchParams.get("plan") ?? "pro_monthly") as PlanKey;
  const isUpgradeMode = searchParams.get("mode") === "upgrade";
  const plan = PLANS[planKey] ?? PLANS.pro_monthly;

  const [status, setStatus] = useState<Status>("checking-auth");
  const [errorMsg, setErrorMsg] = useState("");
  const [accessCode, setAccessCode] = useState<string | null>(null);

  useEffect(() => {
    const redirectToLogin = () =>
      navigate(`/login?next=${encodeURIComponent(`/checkout?plan=${planKey}${isUpgradeMode ? "&mode=upgrade" : ""}`)}`);

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

      // Upgrade mode — no access code needed, user already has a subscription
      if (isUpgradeMode) {
        setStatus("ready");
        return;
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

      // Check if user already has an active subscription → send to download
      const { data: sub } = await supabase.rpc("get_user_subscription");
      if (sub && sub.length > 0) {
        navigate("/download");
        return;
      }

      // No code, no prior access — show the access-code gate
      setStatus("no-code");
    }).catch(redirectToLogin);
  }, [navigate, planKey, isUpgradeMode]);

  async function handleCheckout() {
    setStatus(isUpgradeMode ? "upgrading" : "redirecting");
    const loginUrl = `/login?next=${encodeURIComponent(`/checkout?plan=${planKey}${isUpgradeMode ? "&mode=upgrade" : ""}`)}`;

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

      // ── Upgrade existing subscription ────────────────────────────────────
      if (isUpgradeMode) {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upgrade-subscription`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ plan: planKey }),
          },
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error ?? `Upgrade failed (HTTP ${res.status})`);
        toast({ title: "Plan upgraded!", description: `You're now on ${plan.name}.` });
        navigate("/download");
        return;
      }

      // ── New checkout session ─────────────────────────────────────────────
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
      toast({ title: isUpgradeMode ? "Upgrade failed" : "Checkout failed", description: msg, variant: "destructive" });
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

          <div className="space-y-3 mb-6">
              <Button
                onClick={() => navigate("/#pricing")}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                Back to pricing
              </Button>
            </div>
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
                <p className="text-xs text-muted-foreground mb-1">
                  {isUpgradeMode ? "Upgrading to" : "Selected plan"}
                </p>
                <h1 className="text-2xl font-bold text-white">Zenvi {plan.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                {"displayPrice" in plan && plan.displayPrice ? (
                  <>
                    <div>
                      <span className="text-3xl font-bold text-white">{plan.displayPrice}</span>
                      <span className="text-muted-foreground text-sm ml-1">{"displayPeriod" in plan ? plan.displayPeriod : plan.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Billed {plan.price}{plan.period}</p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>
                  </>
                )}
              </div>
            </div>

            <ul className="space-y-2.5 mb-6 border-t border-white/[0.06] pt-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-white/70">{f}</span>
                </li>
              ))}
            </ul>

            {/* Overage explainer — opt-in lives in /dashboard/usage settings */}
            {plan.tier !== "lifetime" && (
              <div className="mb-6 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60 mb-1.5">
                  About overage
                </p>
                <p className="text-xs text-white/55 leading-relaxed">
                  Overage is <strong className="text-white/80">off by default</strong>. If you run out
                  of credits, paid AI features pause until next cycle. You can enable overage anytime
                  from your dashboard — you set the dollar cap, we never charge above it.
                </p>
              </div>
            )}

            <Button
              onClick={handleCheckout}
              disabled={status === "redirecting" || status === "upgrading"}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium text-sm"
            >
              {status === "redirecting" ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redirecting to payment…</>
              ) : status === "upgrading" ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Upgrading plan…</>
              ) : isUpgradeMode ? (
                "Confirm Upgrade"
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
