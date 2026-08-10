import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CHECKOUT_ACCESS_CODE_KEY } from "@/components/AccessCodeForm";
import AccessCodeForm from "@/components/AccessCodeForm";
import {
  hasActivePaidSubscription,
  planChangeDirection,
  shouldUsePlanChangeApi,
} from "@/lib/checkout-routing";
import {
  clampCheckoutPathIfNeeded,
  resolveCheckoutAccess,
  resolveCheckoutAccessCode,
} from "@/lib/checkout-access";
import { useTierPricing } from "@/hooks/useTierPricing";
import { stripeEdgeFunctionUrl, stripeEdgeHeaders } from "@/lib/stripe-edge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { currencyMeta } from "@shared/currency.ts";

const PLANS = {
  starter_monthly: {
    name: "Starter",
    tier: "starter",
    interval: "monthly" as const,
    description: "Your AI video editor, always on.",
    features: [
      "2,500 credits/month (~$25 USD of AI usage)",
      "≈ 50 AI clips OR 2,500 chats OR 60 min indexing",
      "1 seat",
      "All cloud LLMs (light / standard / premium)",
      "All Kling video models including 2.0",
      "TwelveLabs clip indexing + smart search",
      "1-month credit rollover",
      "Overage opt-in (1.5× sticker, $50 USD cap)",
      "No watermark",
    ],
  },
  starter_annual: {
    name: "Starter (Annual)",
    tier: "starter",
    interval: "annual" as const,
    description: "Your AI video editor, always on.",
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
    tier: "pro",
    interval: "monthly" as const,
    description: "Studio-ready power, pooled across your team.",
    features: [
      "5,500 credits/month (~$55 USD of AI usage)",
      "≈ 110 AI clips OR 5,500 chats OR 250 min indexing",
      "3 pooled seats",
      "Everything in Starter",
      "Priority Runware queue at peak",
      "Per-seat usage analytics",
      "2-month credit rollover",
      "Overage opt-in (1.3× sticker, $150 USD cap)",
    ],
  },
  pro_annual: {
    name: "Pro (Annual)",
    tier: "pro",
    interval: "annual" as const,
    description: "Studio-ready power, pooled across your team.",
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
    tier: "max",
    interval: "monthly" as const,
    description: "One pool. Eight editors. Unlimited creativity.",
    features: [
      "25,000 credits/month (~$250 USD of AI usage)",
      "≈ 500 AI clips OR 25k chats OR 1,600 min indexing",
      "8 pooled seats",
      "Everything in Pro",
      "Priority Runware queue 24/7",
      "3-month credit rollover",
      "Overage opt-in (1.2× sticker, $500 USD cap)",
      "Custom voices (3/org)",
      "Beta access to new models",
    ],
  },
  max_annual: {
    name: "Max (Annual)",
    tier: "max",
    interval: "annual" as const,
    description: "One pool. Eight editors. Unlimited creativity.",
    features: [
      "30,000 credits/month (annual bonus)",
      "8 pooled seats",
      "Everything in Pro",
      "Priority Runware queue 24/7",
      "3-month credit rollover",
      "Custom voices (3/org)",
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;
type Status = "checking-auth" | "no-code" | "ready" | "redirecting" | "error" | "upgrading";

const LEGACY_PLAN_ALIASES: Record<string, PlanKey> = {
  creator_monthly: "starter_monthly",
  creator_annual: "starter_annual",
  studio_monthly: "max_monthly",
  studio_annual: "max_annual",
};

function resolvePlanKey(raw: string | null): PlanKey {
  if (raw && raw in PLANS) return raw as PlanKey;
  if (raw && raw in LEGACY_PLAN_ALIASES) return LEGACY_PLAN_ALIASES[raw];
  return "pro_monthly";
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: pricingLoading, getPlanPrice } = useTierPricing();
  const { currency } = useCurrency();

  const rawPlan = searchParams.get("plan");
  const planKey = resolvePlanKey(rawPlan);
  const isUpgradeMode = searchParams.get("mode") === "upgrade";
  const isDowngradeMode = searchParams.get("mode") === "downgrade";
  const isPlanChangeMode = isUpgradeMode || isDowngradeMode;
  const plan = PLANS[planKey];

  const livePrice = getPlanPrice(plan.tier, plan.interval);

  const [status, setStatus] = useState<Status>("checking-auth");
  const [errorMsg, setErrorMsg] = useState("");
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [skipAccessCode, setSkipAccessCode] = useState(false);

  useEffect(() => {
    if (!rawPlan) {
      navigate("/pricing", { replace: true });
      return;
    }

    const modeParam = isUpgradeMode ? "&mode=upgrade" : isDowngradeMode ? "&mode=downgrade" : "";
    const redirectToLogin = () =>
      navigate(`/login?next=${encodeURIComponent(`/checkout?plan=${planKey}${modeParam}`)}`);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        redirectToLogin();
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at != null && session.expires_at <= now + 60) {
        const { error } = await supabase.auth.refreshSession();
        if (error) { redirectToLogin(); return; }
      }

      const { data: sub } = await supabase.rpc("get_user_subscription");
      const subRow = sub && sub.length > 0 ? sub[0] : null;
      const currentTier = subRow ? (subRow.tier as string) : "free";
      const hasStripeSub = !!subRow?.stripe_subscription_id;

      if (isPlanChangeMode && !hasActivePaidSubscription(currentTier)) {
        navigate(`/checkout?plan=${planKey}`, { replace: true });
        return;
      }

      if (!isPlanChangeMode && (!hasStripeSub || !hasActivePaidSubscription(currentTier))) {
        const clampedPath = await clampCheckoutPathIfNeeded(`/checkout?plan=${planKey}`, {
          skipIfPaid: false,
        });
        if (clampedPath !== `/checkout?plan=${planKey}`) {
          navigate(clampedPath, { replace: true });
          return;
        }
      }

      if (hasStripeSub && hasActivePaidSubscription(currentTier) && !isPlanChangeMode) {
        const direction = planChangeDirection(currentTier, plan.tier);
        if (direction === "same") {
          navigate("/download", { replace: true });
          return;
        }
        if (direction === "upgrade" || direction === "downgrade") {
          navigate(`/checkout?plan=${planKey}&mode=${direction}`, { replace: true });
          return;
        }
      }

      const skipForPlanChange =
        isPlanChangeMode && hasStripeSub && hasActivePaidSubscription(currentTier);
      setSkipAccessCode(skipForPlanChange);
      const access = await resolveCheckoutAccess({ skipForPlanChange });

      if (access.kind === "skip") {
        setStatus("ready");
        return;
      }
      if (access.kind === "resolved") {
        setAccessCode(access.code);
        setStatus("ready");
        return;
      }

      setAccessCode(null);
      setStatus("no-code");
    }).catch(redirectToLogin);
  }, [navigate, planKey, plan.tier, rawPlan, isUpgradeMode, isDowngradeMode, isPlanChangeMode]);

  async function handleCheckout() {
    const modeParam = isUpgradeMode ? "&mode=upgrade" : isDowngradeMode ? "&mode=downgrade" : "";
    const loginUrl = `/login?next=${encodeURIComponent(`/checkout?plan=${planKey}${modeParam}`)}`;

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

      const { data: sub } = await supabase.rpc("get_user_subscription");
      const subRow = sub && sub.length > 0 ? sub[0] : null;
      const currentTier = subRow ? (subRow.tier as string) : "free";
      const hasStripeSub = !!subRow?.stripe_subscription_id;
      const usePlanChangeApi = shouldUsePlanChangeApi(currentTier, plan.tier, hasStripeSub);
      setStatus(usePlanChangeApi ? "upgrading" : "redirecting");

      if (usePlanChangeApi) {
        const res = await fetch(
          stripeEdgeFunctionUrl("upgrade-subscription"),
          {
            method: "POST",
            headers: stripeEdgeHeaders({
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ plan: planKey }),
          },
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error ?? `Plan change failed (HTTP ${res.status})`);
        toast({
          title: isDowngradeMode ? "Plan changed!" : "Plan upgraded!",
          description: `You're now on ${plan.name}.`,
        });
        navigate("/download");
        return;
      }

      if (!usePlanChangeApi) {
        const resolvedCode = accessCode ?? await resolveCheckoutAccessCode();
        if (!resolvedCode) {
          setStatus("no-code");
          toast({
            title: "Access code required",
            description: "Enter your invite code to continue to checkout.",
            variant: "destructive",
          });
          return;
        }
      }

      const resolvedCode = accessCode ?? await resolveCheckoutAccessCode() ?? undefined;

      const res = await fetch(
        stripeEdgeFunctionUrl("create-checkout-session"),
        {
          method: "POST",
          headers: stripeEdgeHeaders({
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            plan: planKey,
            accessCode: resolvedCode,
            currency,
            successUrl: `${window.location.origin}/checkout/success?plan=${planKey}`,
            cancelUrl: `${window.location.origin}/pricing`,
          }),
        },
      );

      const payload = await res.json().catch(() => ({}));

      if (res.status === 401) {
        await supabase.auth.signOut();
        navigate(loginUrl);
        return;
      }

      if (res.status === 403) {
        setStatus("no-code");
        toast({
          title: "Access code required",
          description: payload?.error ?? "Enter your invite code to continue to checkout.",
          variant: "destructive",
        });
        return;
      }

      if (!res.ok) throw new Error(payload?.error ?? `Request failed (HTTP ${res.status})`);
      if (!payload?.url) throw new Error("No checkout URL returned.");

      // The server has the last word on currency: an existing Stripe Customer is
      // locked to the one it first transacted in. Say so before the redirect rather
      // than letting Stripe show a price the page didn't.
      if (payload.currency && payload.currency !== currency) {
        const shown = currencyMeta(currency)?.label ?? currency.toUpperCase();
        const actual = currencyMeta(payload.currency)?.label ?? String(payload.currency).toUpperCase();
        toast({
          title: `Billed in ${actual}`,
          description: payload.currency_locked
            ? `Your account already bills in ${actual}, so we can't switch it to ${shown}.`
            : `${shown} isn't available for this plan, so checkout will use ${actual}.`,
        });
      }

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
            Zenvi is invite-only during beta. Enter your access code to continue to checkout.
          </p>

          <div className="text-left mb-6">
            <AccessCodeForm
              compact
              storageKey={CHECKOUT_ACCESS_CODE_KEY}
              planTier={plan.tier}
              onValidated={(code) => {
                setAccessCode(code);
                setStatus("ready");
              }}
            />
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate("/pricing")}
            className="w-full text-muted-foreground hover:text-white"
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
            to="/pricing"
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
                {pricingLoading ? (
                  <div className="h-9 w-20 bg-white/5 animate-pulse rounded" />
                ) : plan.interval === "annual" && livePrice?.monthly_equivalent_display ? (
                  <>
                    <div>
                      <span className="text-3xl font-bold text-white">{livePrice.monthly_equivalent_display}</span>
                      <span className="text-muted-foreground text-sm ml-1">{livePrice.monthly_equivalent_period ?? "/mo"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Billed {livePrice.display}{livePrice.period}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-white">{livePrice?.display ?? "—"}</span>
                    <span className="text-muted-foreground text-sm ml-1">{livePrice?.period ?? "/mo"}</span>
                  </>
                )}
              </div>
              {livePrice && livePrice.currency !== "usd" && (
                <p className="text-[11px] text-white/45 mt-1">
                  Billed in {currencyMeta(livePrice.currency)?.label ?? livePrice.currency.toUpperCase()} —
                  your bank won't add a foreign transaction fee.
                </p>
              )}
            </div>

            <ul className="space-y-2.5 mb-6 border-t border-white/[0.06] pt-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-white/70">{f}</span>
                </li>
              ))}
            </ul>

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

            <Button
              onClick={handleCheckout}
              disabled={
                status === "redirecting"
                || status === "upgrading"
                || pricingLoading
                || (!skipAccessCode && !accessCode)
              }
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium text-sm"
            >
              {status === "redirecting" ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redirecting to payment…</>
              ) : status === "upgrading" ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Updating plan…</>
              ) : isPlanChangeMode ? (
                isUpgradeMode ? "Confirm Upgrade" : "Confirm Plan Change"
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
