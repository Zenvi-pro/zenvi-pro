import { motion } from "framer-motion";
import { Shield, Zap, DollarSign, Cpu } from "lucide-react";

const benefits = [
  {
    icon: Shield,
    title: "Complete Privacy",
    description: "Your videos never leave your device. No uploads, no cloud storage, no data collection.",
    color: "primary",
  },
  {
    icon: Zap,
    title: "Zero Latency",
    description: "Instant processing without network delays. Real-time edits, real-time results.",
    color: "secondary",
  },
  {
    icon: DollarSign,
    title: "No Per-Use Fees",
    description: "One subscription, unlimited processing. No tokens, no credits, no hidden costs.",
    color: "primary",
  },
];

const WhyLocalAI = () => {
  return (
    <section className="py-24 relative" id="why-local">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why{" "}
              <span className="gradient-text">Local AI</span>?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Traditional cloud-based AI requires uploading your content, waiting for processing, 
              and paying per use. Zenvi runs everything on your device—your data stays yours.
            </p>

            {/* Benefits list */}
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="flex gap-4"
                >
                  <div className={`w-12 h-12 rounded-lg bg-${benefit.color}/20 flex items-center justify-center shrink-0`}>
                    <benefit.icon className={`w-6 h-6 text-${benefit.color}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Chip illustration */}
            <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
              {/* Animated circuit pattern */}
              <div className="absolute inset-0 opacity-20">
                <svg className="w-full h-full" viewBox="0 0 400 400">
                  <defs>
                    <linearGradient id="circuit-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--secondary))" />
                    </linearGradient>
                  </defs>
                  {/* Circuit lines */}
                  <motion.path
                    d="M50,200 H150 V100 H250 V200 H350"
                    stroke="url(#circuit-gradient)"
                    strokeWidth="2"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                  <motion.path
                    d="M50,250 H100 V350 H200 V250 H350"
                    stroke="url(#circuit-gradient)"
                    strokeWidth="2"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                  />
                </svg>
              </div>

              {/* Central chip */}
              <div className="relative z-10 flex flex-col items-center justify-center py-12">
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 20px hsl(270 100% 65% / 0.3)",
                      "0 0 40px hsl(270 100% 65% / 0.5)",
                      "0 0 20px hsl(270 100% 65% / 0.3)",
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/30 border border-primary/50 flex items-center justify-center mb-6"
                >
                  <Cpu className="w-16 h-16 text-primary" />
                </motion.div>

                <h3 className="text-2xl font-bold mb-2 text-center">Your Device. Your Data.</h3>
                <p className="text-muted-foreground text-center max-w-xs">
                  All AI processing happens locally on your machine—nothing is ever uploaded.
                </p>

                {/* Data flow indicators */}
                <div className="flex items-center gap-8 mt-8">
                  <div className="text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-2"
                    >
                      <span className="text-lg">📁</span>
                    </motion.div>
                    <span className="text-xs text-muted-foreground">Local Files</span>
                  </div>
                  
                  <motion.div
                    animate={{ x: [0, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-primary"
                  >
                    →
                  </motion.div>
                  
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2"
                    >
                      <span className="text-lg">⚡</span>
                    </motion.div>
                    <span className="text-xs text-muted-foreground">Local AI</span>
                  </div>
                  
                  <motion.div
                    animate={{ x: [0, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                    className="text-secondary"
                  >
                    →
                  </motion.div>
                  
                  <div className="text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-2"
                    >
                      <span className="text-lg">🎬</span>
                    </motion.div>
                    <span className="text-xs text-muted-foreground">Local Export</span>
                  </div>
                </div>
              </div>

              {/* No cloud badge */}
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/20 border border-destructive/50">
                <span className="text-xs font-medium text-destructive">☁️ No Cloud Required</span>
              </div>
            </div>

            {/* Glow effects */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhyLocalAI;
