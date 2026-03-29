import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    key: "creator",
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
    featured: false,
    cta: "Start Creating",
  },
  {
    key: "pro",
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
    featured: true,
    cta: "Get Pro",
  },
  {
    key: "studio",
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
    featured: false,
    cta: "Get Studio",
  },
];

interface PricingProps {
  onOpenAccessCode: (planKey: string) => void;
}

const Pricing = ({ onOpenAccessCode }: PricingProps) => {
  return (
    <section className="py-section-sm md:py-section relative" id="pricing">
      <div className="mx-auto max-w-content px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-section-title md:text-[48px] md:leading-[1.15] font-semibold text-white mb-4">
            Simple, predictable pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No per-minute fees. No token limits. No cloud costs. Flat rate,
            unlimited use.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`relative rounded-xl border p-8 transition-colors duration-200 ${
                plan.featured
                  ? "border-primary/40 bg-primary/[0.03]"
                  : "border-white/[0.06] bg-white/[0.01]"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-[11px] font-semibold text-white tracking-wide">
                  RECOMMENDED
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-bold text-white">{plan.price}</span>
                <span className="text-muted-foreground text-base ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plan.featured ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-sm text-white/70">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => onOpenAccessCode(plan.key)}
                className={`w-full rounded-lg font-medium ${
                  plan.featured
                    ? "bg-primary hover:bg-primary/90 text-white"
                    : "bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.06]"
                }`}
                size="lg"
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Lifetime access promo card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="relative max-w-5xl mx-auto mt-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.025] p-8"
        >
          <div className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-amber-500/90 text-[11px] font-semibold text-black tracking-wide">
            LIMITED OFFER · MARCH 29
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="md:w-48 shrink-0">
              <h3 className="text-lg font-semibold text-white mb-1">Lifetime Access</h3>
              <p className="text-sm text-muted-foreground mb-4">Pay once. Yours forever.</p>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-bold text-white">$100</span>
                <span className="text-muted-foreground text-base mb-1">one-time</span>
              </div>
            </div>

            <div className="hidden md:block w-px self-stretch bg-white/[0.06]" />

            <ul className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
              {[
                "Everything in Studio",
                "Lifetime access — no subscription ever",
                "All future updates included",
                "5 team seats",
                "Commercial usage rights",
                "Priority support, always",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span className="text-sm text-white/70">{f}</span>
                </li>
              ))}
            </ul>

            <div className="md:w-44 shrink-0">
              <Button
                onClick={() => onOpenAccessCode("lifetime")}
                className="w-full rounded-lg font-medium bg-amber-500 hover:bg-amber-400 text-black"
                size="lg"
              >
                Claim Offer
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                One-time charge. No renewals.
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
