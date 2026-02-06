import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingProps {
  onOpenWaitlist: () => void;
}

const plans = [
  {
    name: "Starter",
    price: "$30",
    period: "/month",
    description: "Perfect for content creators getting started",
    features: [
      "Real-time video editing",
      "Auto-generated subtitles",
      "5 projects per month",
      "1080p export quality",
      "Basic audio cleanup",
      "Email support",
    ],
    featured: false,
  },
  {
    name: "Pro",
    price: "$60",
    period: "/month",
    description: "For professionals who need unlimited power",
    features: [
      "Everything in Starter",
      "Unlimited projects",
      "4K export quality",
      "Advanced audio tools",
      "Custom export presets",
      "Smart scene detection",
      "Priority support",
      "Early access to new features",
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
            Simple,{" "}
            <span className="gradient-text">transparent pricing</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. No per-use charges. Just powerful AI editing for one flat rate.
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
                {plan.featured ? "Get Started Free" : "Start Free Trial"}
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
          All plans include a 14-day free trial. No credit card required.
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;
