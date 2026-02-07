import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingProps {
  onOpenWaitlist: () => void;
}

const plans = [
  {
    name: "Creator",
    price: "$29",
    period: "/month",
    description: "Everything indie creators need to level up their content",
    features: [
      "Unlimited local AI processing",
      "Auto-generated subtitles (50+ languages)",
      "Smart scene detection & clipping",
      "1080p & 4K export",
      "Background noise removal",
      "Email support",
    ],
    featured: false,
  },
  {
    name: "Studio",
    price: "$79",
    period: "/month",
    description: "For professionals and teams who demand the best",
    features: [
      "Everything in Creator",
      "Batch processing for multi-project workflows",
      "Advanced audio sweetening & EQ",
      "Custom export presets & platform profiles",
      "Priority feature requests",
      "Dedicated Slack support",
      "Team license (up to 5 seats)",
      "Commercial usage rights",
    ],
    featured: true,
  },
];

const Pricing = ({ onOpenWaitlist }: PricingProps) => {
  return (
    <section className="py-24 relative" id="pricing">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            One price.{" "}
            <span className="gradient-text">No hidden fees.</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No per-minute fees. No token limits. No cloud costs. Just powerful local AI for a flat monthly rate.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`pricing-card relative ${plan.featured ? "featured" : ""}`}
            >
              {/* Featured badge */}
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-purple-green text-sm font-semibold text-primary-foreground flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Most Popular
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-5xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      plan.featured ? "bg-secondary/20" : "bg-primary/20"
                    }`}>
                      <Check className={`w-3 h-3 ${plan.featured ? "text-secondary" : "text-primary"}`} />
                    </div>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={onOpenWaitlist}
                className={`w-full ${
                  plan.featured
                    ? "neon-button text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
                size="lg"
              >
                {plan.featured ? "Get Studio Access" : "Start Creating"}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-muted-foreground mt-8"
        >
          14-day free trial on all plans. No credit card required to start.
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;
