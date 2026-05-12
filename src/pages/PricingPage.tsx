import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Info } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import WaitlistModal from "@/components/landing/WaitlistModal";
import { cn } from "@/lib/utils";

type TabType = "monthly" | "annual" | "enterprise";

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

export default function PricingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("monthly");
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const openWaitlist = () => setIsWaitlistOpen(true);
  const closeWaitlist = () => setIsWaitlistOpen(false);

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
      <Navbar onOpenWaitlist={openWaitlist} />

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

                        <div className="mb-6">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold">$0</span>
                            <span className="text-xs text-white/60">/mo</span>
                          </div>
                          <p className="text-[11px] text-white/50 mt-1">Limited usage to explore</p>
                        </div>

                        <div className="w-full h-px bg-white/10 my-6" />

                        <ul className="space-y-3.5">
                          {[
                            "1 seat (solo)",
                            "3 active projects",
                            "All models",
                            "Full canvas & layer editor",
                            "Run & create techniques",
                            "FAUNA (unlimited, free)",
                            "Annotations & labels",
                            "Download & export",
                            "Up to 17 generations free*",
                          ].map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs text-white/80 leading-snug">
                              <Check className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => navigate("/login?mode=signup")}
                        className="mt-8 w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-semibold transition-all duration-200 backdrop-blur-md active:scale-95"
                      >
                        Get Free
                      </button>
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

                        <div className="mb-6">
                          {activeTab === "annual" ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-bold">$25</span>
                              <span className="text-xs text-white/40 line-through">$29</span>
                              <span className="text-xs text-white/60">/seat/mo</span>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-bold">$29</span>
                              <span className="text-xs text-white/60">/seat/mo</span>
                            </div>
                          )}
                          <p className="text-[11px] text-white/50 mt-1">Up to 8 seats</p>
                        </div>

                        {/* Special launch offer box */}
                        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[#3275F8] uppercase tracking-wider">Special launch offer</span>
                            <Info className="w-3 h-3 text-white/40" />
                          </div>
                          <div className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                            <span className="text-xs text-white/90 font-medium">Extra $12 usage/seat/mo</span>
                          </div>
                        </div>

                        <ul className="space-y-3.5">
                          {[
                            "Up to 8 seats",
                            "Pooled team usage",
                            "Unlimited projects",
                            "All models",
                            "API & MCP access",
                            "Real-time collaboration",
                          ].map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs text-white/80 leading-snug">
                              <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => navigate(`/checkout?plan=${activeTab === "annual" ? "creator_annual" : "creator_monthly"}`)}
                        className="mt-8 w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-semibold transition-all duration-200 backdrop-blur-md active:scale-95"
                      >
                        Get Starter
                      </button>
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

                        <div className="mb-6">
                          {activeTab === "annual" ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-bold">$39</span>
                              <span className="text-xs text-white/40 line-through">$49</span>
                              <span className="text-xs text-white/60">/seat/mo</span>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-bold">$49</span>
                              <span className="text-xs text-white/60">/seat/mo</span>
                            </div>
                          )}
                          <p className="text-[11px] text-white/50 mt-1">Up to 8 seats</p>
                        </div>

                        {/* Special launch offer box */}
                        <div className="mb-6 rounded-xl border border-[#3275F8]/30 bg-[#3275F8]/[0.05] p-3.5 backdrop-blur-md shadow-inner">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[#3275F8] uppercase tracking-wider">Special launch offer</span>
                            <Info className="w-3 h-3 text-[#3275F8]/70" />
                          </div>
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                              <span className="text-xs text-white/90 font-medium leading-snug">Unmetered Nano Banana 2 and Pro (off-peak)</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                              <span className="text-xs text-white/90 font-medium leading-snug">Extra $50 included usage/seat/mo</span>
                            </div>
                          </div>
                        </div>

                        <ul className="space-y-3.5">
                          {[
                            "Up to 8 seats",
                            "Everything in Starter",
                            "Shared team assets",
                            "Shared elements",
                            "Per-member usage caps",
                            "Usage analytics",
                          ].map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs text-white/90 leading-snug">
                              <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => navigate(`/checkout?plan=${activeTab === "annual" ? "pro_annual" : "pro_monthly"}`)}
                        className="mt-8 w-full py-3 rounded-xl bg-[#3275F8] hover:bg-[#2563eb] text-white text-xs font-bold transition-all duration-200 shadow-[0_4px_20px_rgba(50,117,248,0.4)] active:scale-95"
                      >
                        Get Pro
                      </button>
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

                        <div className="mb-6">
                          {activeTab === "annual" ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-bold">$149</span>
                              <span className="text-xs text-white/40 line-through">$199</span>
                              <span className="text-xs text-white/60">/seat/mo</span>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-bold">$199</span>
                              <span className="text-xs text-white/60">/seat/mo</span>
                            </div>
                          )}
                          <p className="text-[11px] text-white/50 mt-1">Up to 8 seats</p>
                        </div>

                        {/* Special launch offer box */}
                        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[#3275F8] uppercase tracking-wider">Special launch offer</span>
                            <Info className="w-3 h-3 text-white/40" />
                          </div>
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                              <span className="text-xs text-white/90 font-medium leading-snug">Unmetered Nano Banana 2 and Pro (24/7)</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                              <span className="text-xs text-white/90 font-medium leading-snug">Extra $100 included usage/seat/mo</span>
                            </div>
                          </div>
                        </div>

                        <ul className="space-y-3.5">
                          {[
                            "Up to 8 seats",
                            "Everything in Pro",
                            "Custom voices (3/org)",
                          ].map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs text-white/80 leading-snug">
                              <Check className="w-3.5 h-3.5 text-[#3275F8] shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => navigate("/checkout?plan=studio_monthly")}
                        className="mt-8 w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-semibold transition-all duration-200 backdrop-blur-md active:scale-95"
                      >
                        Get Max
                      </button>
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
                        We help the world's best creative teams adapt to the generative age. Let us help you.
                      </h2>
                      <p className="text-xs md:text-sm text-white/60 mb-10 max-w-lg font-normal">
                        Bespoke workflows, dedicated support, white-glove onboarding, and more.
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
                            Faster production, without sacrificing quality
                          </h4>
                          <div className="relative z-10">
                            <p className="text-[11px] text-white/70 italic leading-normal mb-2">
                              "What would've taken me days of 3D reconstruction and rendering took me less than an hour."
                            </p>
                            <span className="text-[10px] font-bold text-[#3275F8]">Brand Marketing Team</span>
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
                            Shared creative system that scales
                          </h4>
                          <div className="relative z-10">
                            <p className="text-[11px] text-white/70 italic leading-normal mb-2">
                              "I look at Zenvi as an operating system more than a creative tool. We run all of our agency's research, design, and advertising in it."
                            </p>
                            <span className="text-[10px] font-bold text-[#3275F8]">Creative Agency</span>
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
                            Seamless collaboration across whole team
                          </h4>
                          <div className="relative z-10">
                            <p className="text-[11px] text-white/70 italic leading-normal mb-2">
                              "We have really enjoyed the collaborative nature of the platform and access to such a robust collection of APIs."
                            </p>
                            <span className="text-[10px] font-bold text-[#3275F8]">Film Studio</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Logo Ticker Strip */}
                    <div className="pt-6 border-t border-white/10">
                      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 opacity-50 select-none">
                        <span className="font-serif text-sm tracking-tighter font-bold">Pentagram</span>
                        <span className="font-mono text-xs font-black tracking-widest">!!!MSCHF</span>
                        <span className="font-sans text-xs font-extrabold uppercase tracking-tight">Riot Games</span>
                        <span className="font-serif text-xs font-black tracking-widest">WPP</span>
                        <span className="font-sans text-xs font-bold tracking-tight">Anomaly</span>
                        <span className="font-sans text-xs font-black uppercase">Supercell</span>
                        <span className="font-mono text-xs font-bold tracking-widest">AKQA</span>
                        <span className="font-serif text-xs italic font-bold tracking-tight">Wayfair</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side Checklist Panel (cols 9-12) */}
                  <div className="lg:col-span-4 flex flex-col justify-between pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-white/10 pt-8 lg:pt-0 relative z-20">
                    <div>
                      <h3 className="text-base font-bold mb-6">What you get:</h3>

                      <ul className="space-y-4 mb-8">
                        {[
                          "Custom enterprise pricing",
                          "SOC II Compliance",
                          "Model access controls",
                          "Credit usage management",
                          "Dedicated real-time support",
                          "Bespoke onboarding, training, and creative support",
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
      <WaitlistModal isOpen={isWaitlistOpen} onClose={closeWaitlist} />
    </div>
  );
}
