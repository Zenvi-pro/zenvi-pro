import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingProps {
  onOpenAccessCode: (planKey: string) => void;
}

const Pricing = ({ onOpenAccessCode }: PricingProps) => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section className="py-section-sm md:py-section relative" id="pricing">
      <div className="mx-auto max-w-content px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-section-title md:text-[48px] md:leading-[1.15] font-semibold text-white mb-3">
            Simple, predictable pricing
          </h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto mb-8">
            No per-minute fees. No token limits. No cloud costs. Flat rate, unlimited use.
          </p>

          <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                !isAnnual ? "bg-white text-black" : "text-muted-foreground hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isAnnual ? "bg-white text-black" : "text-muted-foreground hover:text-white"
              }`}
            >
              Annual{" "}
              <span className="text-xs font-semibold text-primary ml-1">Save 28%</span>
            </button>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">

          {/* ── Creator ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0, duration: 0.5 }}
            className="relative rounded-xl border border-white/[0.06] bg-white/[0.01] p-6 flex flex-col"
          >
            <div className="mb-5">
              <h3 className="text-base font-semibold text-white mb-0.5">Creator</h3>
              <p className="text-xs text-muted-foreground">For indie creators & solo editors</p>
            </div>

            <div className="mb-6">
              {isAnnual ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground line-through">$29</span>
                    <span className="text-4xl font-bold text-white ml-1">$20.75</span>
                    <span className="text-muted-foreground text-sm ml-1">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Billed as $249/yr</p>
                </>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">$29</span>
                  <span className="text-muted-foreground text-sm ml-1">/mo</span>
                </div>
              )}
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {[
                "1,500 AI credits/month",
                "1080p export",
                "60 min video indexing",
                "Unlimited AI chat",
                "20% credit rollover",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-white/70">{f}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => onOpenAccessCode(isAnnual ? "creator_annual" : "creator_monthly")}
              className="w-full rounded-lg font-medium bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.06]"
            >
              Get Started
            </Button>
          </motion.div>

          {/* ── Pro ─────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="relative rounded-xl border border-primary/40 bg-primary/[0.03] p-6 flex flex-col"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-[11px] font-semibold text-white tracking-wide whitespace-nowrap">
              MOST POPULAR
            </div>

            <div className="mb-5">
              <h3 className="text-base font-semibold text-white mb-0.5">Pro</h3>
              <p className="text-xs text-muted-foreground">For freelancers & marketing teams</p>
            </div>

            <div className="mb-6">
              {isAnnual ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground line-through">$99</span>
                    <span className="text-4xl font-bold text-white ml-1">$83.25</span>
                    <span className="text-muted-foreground text-sm ml-1">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Billed as $999/yr</p>
                </>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">$99</span>
                  <span className="text-muted-foreground text-sm ml-1">/mo</span>
                </div>
              )}
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {[
                "5,000 AI credits/month",
                "4K export",
                "250 min video indexing",
                "Morph & transition generation",
                "Priority queue",
                "25% rollover + brand kit",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
                  <span className="text-sm text-white/70">{f}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => onOpenAccessCode(isAnnual ? "pro_annual" : "pro_monthly")}
              className="w-full rounded-lg font-medium bg-primary hover:bg-primary/90 text-white"
            >
              Go Pro
            </Button>
          </motion.div>

          {/* ── Studio ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative rounded-xl border border-white/[0.06] bg-white/[0.01] p-6 flex flex-col"
          >
            <div className="mb-5">
              <h3 className="text-base font-semibold text-white mb-0.5">Studio</h3>
              <p className="text-xs text-muted-foreground">For agencies & creative teams</p>
            </div>

            <div className="mb-6">
              {isAnnual ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">$1,999</span>
                    <span className="text-muted-foreground text-sm ml-1">/yr</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Custom pricing available</p>
                </>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">$199</span>
                  <span className="text-muted-foreground text-sm ml-1">/mo</span>
                </div>
              )}
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {[
                "12,000 shared credits across 3 seats",
                "4K export",
                "600 min video indexing",
                "Everything in Pro",
                "Team analytics dashboard",
                "API access",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-white/70">{f}</span>
                </li>
              ))}
            </ul>

            {isAnnual ? (
              <a href="mailto:sales@zenvi.app?subject=Zenvi%20Studio%20Annual">
                <Button className="w-full rounded-lg font-medium bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.06]">
                  Contact Sales
                </Button>
              </a>
            ) : (
              <Button
                onClick={() => onOpenAccessCode("studio_monthly")}
                className="w-full rounded-lg font-medium bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.06]"
              >
                Get Studio
              </Button>
            )}
          </motion.div>
        </div>

        {/* ── Lifetime promo ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="relative max-w-5xl mx-auto mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.025] p-6 md:p-8"
        >
          <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-amber-500/90 text-[11px] font-semibold text-black tracking-wide">
            LIMITED OFFER · MARCH 29
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="shrink-0">
              <h3 className="text-base font-semibold text-white mb-0.5">Lifetime Access</h3>
              <p className="text-xs text-muted-foreground mb-4">Pay once. Yours forever.</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">$99</span>
                <span className="text-muted-foreground text-sm ml-1">one-time</span>
              </div>
            </div>

            <div className="hidden md:block w-px self-stretch bg-white/[0.06]" />

            <ul className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {[
                "1,000 AI credits/month, forever",
                "All Creator features",
                "No subscription, no renewals",
                "Locked in at today's price",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="text-sm text-white/70">{f}</span>
                </li>
              ))}
            </ul>

            <div className="shrink-0 md:w-44">
              <Button
                onClick={() => onOpenAccessCode("lifetime")}
                className="w-full rounded-lg font-medium bg-amber-500 hover:bg-amber-400 text-black"
              >
                Claim Lifetime Access
              </Button>
              <p className="text-xs text-amber-400/70 text-center mt-2">
                March 29 only
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground mt-10"
        >
          Access code required. Invite-only during beta.
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;
