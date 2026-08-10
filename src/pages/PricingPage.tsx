import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Info } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTierPricing, type TierPriceDisplay } from "@/hooks/useTierPricing";
import { buildCheckoutHref, buildPaidPlanLoginHref, planChangeDirection } from "@/lib/checkout-routing";
import { useCurrency } from "@/contexts/CurrencyContext";
import { currencyMeta, formatMoney } from "@shared/currency.ts";
import CurrencySelect from "@/components/CurrencySelect";

type TabType = "monthly" | "annual" | "enterprise";
type PaidTier = "starter" | "pro" | "max";

function PlanPrice({
  tier,
  activeTab,
  loading,
  getPlanPrice,
  currency,
}: {
  tier: "free" | PaidTier;
  activeTab: TabType;
  loading: boolean;
  getPlanPrice: (tier: string, interval: "monthly" | "annual") => TierPriceDisplay | null;
  currency: string;
}) {
  if (loading) {
    return (
      <div className="mb-6">
        <div className="h-10 w-28 bg-white/5 animate-pulse rounded" />
      </div>
    );
  }

  if (tier === "free") {
    return (
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{formatMoney(0, currency, navigator.language)}</span>
          <span className="text-xs text-white/60">/mo</span>
        </div>
      </div>
    );
  }

  const monthly = getPlanPrice(tier, "monthly");
  const annual = getPlanPrice(tier, "annual");

  if (activeTab === "annual" && annual?.monthly_equivalent_display) {
    return (
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{annual.monthly_equivalent_display}</span>
          {monthly && (
            <span className="text-xs text-white/40 line-through">{monthly.display}</span>
          )}
          <span className="text-xs text-white/60">/mo</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold">{monthly?.display ?? "—"}</span>
        <span className="text-xs text-white/60">{monthly?.period ?? "/mo"}</span>
      </div>
    </div>
  );
}

// Liquid Glass Card Wrapper Component ensuring gorgeous multi-layer thick glossy glass logic without SVG container edge warping
interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  isPro?: boolean;
}

function LiquidGlassCard({ children, className, isPro }: LiquidGlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[28px] transition-all duration-700 overflow-hidden group flex flex-col justify-between items-stretch h-full",
        isPro
          ? "p-[2px] shadow-[0_0_40px_rgba(50,117,248,0.25)] hover:-translate-y-1"
          : "shadow-2xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] hover:-translate-y-0.5",
        className
      )}
      style={{
        boxShadow: isPro
          ? undefined
          : "0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 2px 2px 1px 0 rgba(255, 255, 255, 0.15), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.05)",
        transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
      }}
    >
      {/* Spinning border highlight loop for Pro tier */}
      {isPro && (
        <div className="absolute inset-[-100%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0%,transparent_80%,#3275F8_90%,#ffffff_100%)] pointer-events-none z-0" />
      )}

      {/* Main Glass Outer Body */}
      <div
        className={cn(
          "relative w-full h-full rounded-[26px] overflow-hidden flex flex-col justify-between z-10 transition-colors duration-500",
          isPro
            ? "bg-[#050505]/90 backdrop-blur-2xl"
            : "bg-white/[0.08] group-hover:bg-white/[0.11] backdrop-blur-xl"
        )}
        style={{
          boxShadow: isPro
            ? "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.2), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.05)"
            : "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.28), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.08)"
        }}
      >
        {/* Layer 1: Ambient internal gradient shimmer layer */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-50 group-hover:opacity-90 transition-opacity duration-700 mix-blend-screen"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(50,117,248,0.15), rgba(255,255,255,0.02))",
          }}
        />

        {/* Layer 2: Glossy specular lip line highlight */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none z-10" />

        {/* Foreground Content Wrapper ensuring pristine pixel-perfect readability */}
        <div className="relative z-30 p-8 flex flex-col justify-between h-full flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

const TIER_ORDER: Record<string, number> = {
  none: 0,
  free: 0,
  starter: 1,
  creator: 1,
  pro: 2,
  max: 3,
  studio: 3,
};

export default function PricingPage() {
  const navigate = useNavigate();
  const { loading: pricingLoading, getPlanPrice, supportedCurrencies } = useTierPricing();
  const { currency } = useCurrency();
  const [activeTab, setActiveTab] = useState<TabType>("monthly");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>("none");

  useEffect(() => {
    const fetchTier = async () => {
      try {
        const { data: totalsData } = await supabase.rpc("get_monthly_totals");
        const row = Array.isArray(totalsData) ? totalsData[0] : totalsData;
        setCurrentTier(row?.tier ?? "none");
      } catch (err) {
        console.error("Failed to fetch monthly totals/tier:", err);
        // Fallback check
        const { data: subData } = await supabase.rpc("get_user_subscription");
        if (subData && subData.length > 0) {
          setCurrentTier(subData[0].tier ?? "none");
        } else {
          setCurrentTier("none");
        }
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      const logged = !!data.session;
      setIsLoggedIn(logged);
      if (logged) {
        fetchTier();
      } else {
        setCurrentTier("none");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      const logged = !!s;
      setIsLoggedIn(logged);
      if (logged) {
        fetchTier();
      } else {
        setCurrentTier("none");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getButtonProps = (tier: string, defaultLabel: string) => {
    const planKey = activeTab === "annual" ? `${tier}_annual` : `${tier}_monthly`;

    if (!isLoggedIn) {
      return {
        label: defaultLabel,
        href: tier === "free"
          ? "/login?mode=signup"
          : buildPaidPlanLoginHref(planKey),
        disabled: false,
      };
    }

    const currentOrder = TIER_ORDER[currentTier] ?? 0;
    const tileOrder = TIER_ORDER[tier] ?? 0;

    const isCurrent = currentTier === tier ||
      (tier === "starter" && currentTier === "creator") ||
      (tier === "max"     && currentTier === "studio") ||
      (tier === "free"    && (currentTier === "none" || currentTier === "free"));

    if (isCurrent) {
      return {
        label: "Current Plan",
        href: "#",
        disabled: true,
      };
    }

    if (tier === "free") {
      return {
        label: "Downgrade to Free",
        href: `/checkout?plan=free_monthly&mode=downgrade`,
        disabled: false,
      };
    }

    const direction = planChangeDirection(currentTier, tier);
    const isUpgrade = tileOrder > currentOrder;
    return {
      label: isUpgrade ? `Upgrade to ${defaultLabel.replace("Get ", "")}` : `Downgrade to ${defaultLabel.replace("Get ", "")}`,
      href: buildCheckoutHref(
        planKey,
        currentTier,
        direction === "new" ? "new" : direction === "upgrade" ? "upgrade" : "downgrade",
      ),
      disabled: false,
    };
  };

  const renderPlanButton = (tier: string, defaultLabel: string, isProCard = false) => {
    const { label, href, disabled } = getButtonProps(tier, defaultLabel);

    if (disabled) {
      return (
        <button
          disabled
          className="mt-8 w-full py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-white/30 text-xs font-medium cursor-not-allowed"
        >
          {label}
        </button>
      );
    }

    const baseClass = isProCard
      ? "mt-8 w-full py-3 rounded-xl bg-[#3275F8] hover:bg-[#2563eb] text-white text-xs font-bold transition-all duration-200 shadow-[0_4px_20px_rgba(50,117,248,0.4)] active:scale-95 text-center block"
      : "mt-8 w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-semibold transition-all duration-200 backdrop-blur-md active:scale-95 text-center block";

    return (
      <button
        onClick={() => navigate(href)}
        className={baseClass}
      >
        {label}
      </button>
    );
  };

  // Automatically scroll to the very top of the page whenever the user navigates here
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-[#3275F8]/20 selection:text-[#3275F8] relative overflow-hidden font-sans">

      {/* Fully Immersive Fixed Video Backdrop filling the entire viewport behind the header */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover scale-[1.35] opacity-40"
          src="/hero-video.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        {/* Soft immersive multi-stop dark overlay ensuring vibrant video shimmer and top-tier text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-[#050505]/95 backdrop-blur-[1px]" />

        {/* Central ambient Zenvi Blue core aura */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[#3275F8]/12 blur-[180px] rounded-full" />
      </div>

      {/* Main App Navigation wrapper */}
      <Navbar />

      {/* Main Layout Container expanded to give magnificent high-end width */}
      <main className="flex-1 pt-36 pb-24 px-6 max-w-[1560px] w-[96%] mx-auto relative z-10 flex flex-col items-center">

        {/* Cinematic Headline Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12 w-full"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-serif">
            Plans & Pricing
          </h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto font-normal leading-relaxed">
            Scale your creative workflow with models that adapt to your team. Start free, upgrade as you grow.
          </p>
        </motion.div>

        {/* Tab Selector configured as an ultra-luxurious pill container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex justify-center mb-16 w-full"
        >
          <div
            className="inline-flex items-center p-1 rounded-full bg-white/[0.04] backdrop-blur-3xl relative overflow-hidden"
            style={{
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 2px 2px 1px 0 rgba(255, 255, 255, 0.12), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.04)",
            }}
          >
            {/* Ambient liquid filter base layer inside tabs */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen"
              style={{
                background: "linear-gradient(135deg, rgba(50,117,248,0.3), transparent)",
              }}
            />

            <button
              onClick={() => setActiveTab("monthly")}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 relative z-10",
                activeTab === "monthly" ? "text-white" : "text-white/60 hover:text-white/90"
              )}
            >
              {activeTab === "monthly" && (
                <motion.div
                  layoutId="pricing-tab-indicator"
                  className="absolute inset-0 bg-white/[0.08] rounded-full border border-white/10 shadow-inner"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Monthly</span>
            </button>

            <button
              onClick={() => setActiveTab("annual")}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 relative z-10 flex items-center gap-2",
                activeTab === "annual" ? "text-white" : "text-white/60 hover:text-white/90"
              )}
            >
              {activeTab === "annual" && (
                <motion.div
                  layoutId="pricing-tab-indicator"
                  className="absolute inset-0 bg-white/[0.08] rounded-full border border-white/10 shadow-inner"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Annual</span>
              <span className="relative z-10 text-[10px] font-bold text-[#3275F8] bg-[#3275F8]/10 border border-[#3275F8]/30 px-2 py-0.5 rounded-full backdrop-blur-md">
                20% off
              </span>
            </button>

            <button
              onClick={() => setActiveTab("enterprise")}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 relative z-10",
                activeTab === "enterprise" ? "text-white" : "text-white/60 hover:text-white/90"
              )}
            >
              {activeTab === "enterprise" && (
                <motion.div
                  layoutId="pricing-tab-indicator"
                  className="absolute inset-0 bg-white/[0.08] rounded-full border border-white/10 shadow-inner"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Enterprise</span>
            </button>
          </div>

          {activeTab !== "enterprise" && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <CurrencySelect options={supportedCurrencies} />
              {currency !== "usd" && (
                <span className="text-[11px] text-white/45">
                  Billed in {currencyMeta(currency)?.label ?? currency.toUpperCase()} — no foreign transaction fee
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Tab Content Layouts */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {activeTab !== "enterprise" ? (
              /* Monthly / Annual 4-Column Liquid Glass Grid */
              <motion.div
                key="standard-plans"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch"
              >
                {/* Tier 1: Free */}
                <div>
                  <LiquidGlassCard>
                    <div className="flex flex-col justify-between h-full flex-1">
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight mb-2">Free</h3>
                        <p className="text-xs text-white/60 min-h-[32px] mb-6 leading-relaxed">
                          Try Zenvi and explore the canvas.
                        </p>

                        <PlanPrice
                          tier="free"
                          activeTab={activeTab}
                          loading={pricingLoading}
                          getPlanPrice={getPlanPrice}
                          currency={currency}
                        />
                        <p className="text-[11px] text-white/50 -mt-4 mb-6">100 credits/month to try things</p>

                        {/* Free credit allotment */}
                        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Monthly trial</span>
                            <Info className="w-3 h-3 text-white/40" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">100</span>
                            <span className="text-[11px] text-white/55">credits / mo</span>
                          </div>
                          <p className="mt-1.5 text-[10.5px] text-white/45 leading-snug">
                            ~2 AI clips · or 100 chats · or 6 min indexing · Ollama local models stay free
                          </p>
                        </div>

                        <ul className="space-y-3.5">
                          {[
                            "1 seat (solo)",
                            "Local Ollama models (free, unlimited)",
                            "All cloud features (capped by 100 cr)",
                            "Watermark on exports",
                            "3 active projects",
                            "Full canvas & layer editor",
                          ].map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs text-white/80 leading-snug">
                              <Check className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {renderPlanButton("free", "Get Free")}
                    </div>
                  </LiquidGlassCard>
                </div>

                {/* Tier 2: Starter */}
                <div>
                  <LiquidGlassCard>
                    <div className="flex flex-col justify-between h-full flex-1">
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight mb-2">Starter</h3>
                        <p className="text-xs text-white/60 min-h-[32px] mb-6 leading-relaxed">
                          Your own creative workspace.
                        </p>

                        <PlanPrice
                          tier="starter"
                          activeTab={activeTab}
                          loading={pricingLoading}
                          getPlanPrice={getPlanPrice}
                          currency={currency}
                        />
                        <p className="text-[11px] text-white/50 -mt-4 mb-6">1 seat</p>

                        {/* Credit allotment */}
                        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[#3275F8] uppercase tracking-wider">Monthly credits</span>
                            <Info className="w-3 h-3 text-white/40" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">2,500</span>
                            <span className="text-[11px] text-white/55">≈ $25 USD of AI</span>
                          </div>
                          <p className="mt-1.5 text-[10.5px] text-white/45 leading-snug">
                            ~50 AI video clips · or 2,500 chats · or 60 min of indexing · mix &amp; match
                          </p>
                        </div>

                        <ul className="space-y-3.5">
                          {[
                            "All cloud LLMs (light / standard / premium)",
                            "Kling O1 Pro video generation (Runware)",
                            "TwelveLabs clip indexing + search",
                            "1-month credit rollover",
                            "Overage opt-in (1.5× sticker)",
                            "No watermark",
                          ].map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs text-white/80 leading-snug">
                              <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {renderPlanButton("starter", "Get Starter")}
                    </div>
                  </LiquidGlassCard>
                </div>

                {/* Tier 3: Pro */}
                <div>
                  <LiquidGlassCard isPro>
                    <div className="flex flex-col justify-between h-full flex-1">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-bold tracking-tight">Pro</h3>
                          <span className="text-[10px] font-bold text-[#3275F8] bg-[#3275F8]/10 border border-[#3275F8]/30 px-2.5 py-1 rounded-full shadow-[0_0_15px_rgba(50,117,248,0.3)] backdrop-blur-md">
                            Most Popular
                          </span>
                        </div>
                        <p className="text-xs text-white/60 min-h-[32px] mb-6 leading-relaxed">
                          Full collaboration and workflow power.
                        </p>

                        <PlanPrice
                          tier="pro"
                          activeTab={activeTab}
                          loading={pricingLoading}
                          getPlanPrice={getPlanPrice}
                          currency={currency}
                        />
                        <p className="text-[11px] text-white/50 -mt-4 mb-6">3 pooled seats</p>

                        {/* Credit allotment */}
                        <div className="mb-6 rounded-xl border border-[#3275F8]/30 bg-[#3275F8]/[0.05] p-3.5 backdrop-blur-md shadow-inner">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[#3275F8] uppercase tracking-wider">Monthly credits</span>
                            <Info className="w-3 h-3 text-[#3275F8]/70" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">5,500</span>
                            <span className="text-[11px] text-white/55">≈ $55 USD of AI</span>
                          </div>
                          <p className="mt-1.5 text-[10.5px] text-white/55 leading-snug">
                            ~110 AI clips · or 5,500 chats · or 250 min indexing · pooled across seats
                          </p>
                        </div>

                        <ul className="space-y-3.5">
                          {[
                            "3 pooled seats",
                            "Everything in Starter",
                            "Priority Runware queue (peak)",
                            "Usage analytics per seat",
                            "2-month credit rollover",
                            "Overage opt-in (1.3× sticker)",
                          ].map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs text-white/90 leading-snug">
                              <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {renderPlanButton("pro", "Get Pro", true)}
                    </div>
                  </LiquidGlassCard>
                </div>

                {/* Tier 4: Max */}
                <div>
                  <LiquidGlassCard>
                    <div className="flex flex-col justify-between h-full flex-1">
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight mb-2">Max</h3>
                        <p className="text-xs text-white/60 min-h-[32px] mb-6 leading-relaxed">
                          Creative infrastructure at scale.
                        </p>

                        <PlanPrice
                          tier="max"
                          activeTab={activeTab}
                          loading={pricingLoading}
                          getPlanPrice={getPlanPrice}
                          currency={currency}
                        />
                        <p className="text-[11px] text-white/50 -mt-4 mb-6">8 pooled seats</p>

                        {/* Credit allotment */}
                        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[#3275F8] uppercase tracking-wider">Monthly credits</span>
                            <Info className="w-3 h-3 text-white/40" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">25,000</span>
                            <span className="text-[11px] text-white/55">≈ $250 USD of AI</span>
                          </div>
                          <p className="mt-1.5 text-[10.5px] text-white/55 leading-snug">
                            ~500 AI clips · or 25k chats · or 1,600 min indexing · 8-seat pool
                          </p>
                        </div>

                        <ul className="space-y-3.5">
                          {[
                            "8 pooled seats",
                            "Everything in Pro",
                            "Priority Runware queue 24/7",
                            "3-month credit rollover",
                            "Overage opt-in (1.2× sticker)",
                            "Custom voices (3/org)",
                          ].map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs text-white/80 leading-snug">
                              <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {renderPlanButton("max", "Get Max")}
                    </div>
                  </LiquidGlassCard>
                </div>
              </motion.div>
            ) : (
              /* Enterprise View — Integrated Liquid Glass Split Dashboard */
              <motion.div
                key="enterprise-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-[32px] overflow-hidden"
                style={{
                  boxShadow: "0 12px 48px 0 rgba(0, 0, 0, 0.5), inset 2px 2px 1px 0 rgba(255, 255, 255, 0.15), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.05)",
                }}
              >
                {/* Main Glass Module Body */}
                <div className="relative z-10 bg-white/[0.03] backdrop-blur-2xl p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12">

                  {/* Liquid filter caustic base layer */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen z-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(50,117,248,0.2), transparent)",
                    }}
                  />

                  {/* Specular lip top gloss layer */}
                  <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none z-10" />

                  {/* Left Container (cols 1-8) */}
                  <div className="lg:col-span-8 flex flex-col justify-between relative z-20">
                    <div>
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-3 max-w-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80 font-serif">
                        AI editing, behind your firewall.
                      </h2>
                      <p className="text-xs md:text-sm text-white/60 mb-10 max-w-lg font-normal">
                        Your hardware. Your models. Your rules.
                      </p>

                      {/* Liquid Glass Bentos */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                        {/* Bento 1 */}
                        <div
                          className="relative rounded-2xl overflow-hidden p-5 flex flex-col justify-between h-[220px] group transition-all duration-500 hover:-translate-y-0.5"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            boxShadow: "inset 1px 1px 1px 0 rgba(255,255,255,0.1), inset -1px -1px 1px 0 rgba(255,255,255,0.02)",
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-500" />
                          <h4 className="text-sm font-semibold relative z-10 leading-snug">
                            Days into hours
                          </h4>
                          <div className="relative z-10">
                            <p className="text-[11px] text-white/70 italic leading-normal mb-2">
                              "We could render on our own GPUs. No queue, no per-minute meter, no upload bar. The studio runs at the speed of the rack."
                            </p>
                            <span className="text-[10px] font-bold text-[#3275F8]">Superteam Marketing Team</span>
                          </div>
                        </div>

                        {/* Bento 2 */}
                        <div
                          className="relative rounded-2xl overflow-hidden p-5 flex flex-col justify-between h-[220px] group transition-all duration-500 hover:-translate-y-0.5"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            boxShadow: "inset 1px 1px 1px 0 rgba(255,255,255,0.1), inset -1px -1px 1px 0 rgba(255,255,255,0.02)",
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-[#3275F8]/10 via-transparent to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-500" />
                          <h4 className="text-sm font-semibold relative z-10 leading-snug">
                            One timeline for every project.
                          </h4>
                          <div className="relative z-10">
                            <p className="text-[11px] text-white/70 italic leading-normal mb-2">
                              "We could share edits across the team without sharing the footage. Our raw media never left our network."
                            </p>
                            <span className="text-[10px] font-bold text-[#3275F8]">Ajna</span>
                          </div>
                        </div>

                        {/* Bento 3 */}
                        <div
                          className="relative rounded-2xl overflow-hidden p-5 flex flex-col justify-between h-[220px] group transition-all duration-500 hover:-translate-y-0.5"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            boxShadow: "inset 1px 1px 1px 0 rgba(255,255,255,0.1), inset -1px -1px 1px 0 rgba(255,255,255,0.02)",
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-500" />
                          <h4 className="text-sm font-semibold relative z-10 leading-snug">
                            Audit every frame
                          </h4>
                          <div className="relative z-10">
                            <p className="text-[11px] text-white/70 italic leading-normal mb-2">
                              "SSO, RBAC, network policy, audit logs. our model calls route through our keys. Compliance became easy with a trail."
                            </p>
                            <span className="text-[10px] font-bold text-[#3275F8]">Passport</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Logo Ticker Strip */}
                    <div className="pt-6 border-t border-white/10">
                      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 opacity-50 select-none">
                        <span className="font-serif text-sm tracking-tighter font-bold"> In pilot with select studios. Reach out for our current roster.</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side Checklist Panel (cols 9-12) */}
                  <div className="lg:col-span-4 flex flex-col justify-between pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-white/10 pt-8 lg:pt-0 relative z-20">
                    <div>
                      <h3 className="text-base font-bold mb-6">What you get:</h3>

                      <ul className="space-y-4 mb-8">
                        {[
                          "On-prem or air-gapped deployment",
                          "SOC 2 Type II",
                          "Bring your own API keys for hosted models",
                          "No usage caps. No credit systems.",
                          "Direct line to the founding team",
                          "Custom fine-tuning, on your data, on your hardware",
                        ].map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-xs text-white/90 leading-relaxed">
                            <Check className="w-4 h-4 text-[#3275F8] shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <a
                      href="https://calendly.com/nilay800/zenvi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 rounded-xl bg-[#3275F8] hover:bg-[#2563eb] text-white text-xs font-bold transition-all duration-200 shadow-[0_4px_20px_rgba(50,117,248,0.4)] active:scale-95 text-center block"
                    >
                      Contact sales
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Wrapper */}
      <Footer />
    </div>
  );
}
