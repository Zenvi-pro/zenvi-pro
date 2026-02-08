import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  Captions,
  Scissors,
  AudioWaveform,
  Download,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    category: "PERFORMANCE",
    title: "Instant AI Edits",
    description:
      "See changes in real time. No rendering queues, no waiting—edits happen the moment you make them.",
  },
  {
    icon: Shield,
    category: "PRIVACY",
    title: "100% Local Processing",
    description:
      "Every frame stays on your device. No cloud uploads, no third-party access, no data collection.",
  },
  {
    icon: Captions,
    category: "CAPTIONS",
    title: "Auto-Subtitles in 50+ Languages",
    description:
      "Generate perfectly timed captions in seconds. Accurate even with accents and background noise.",
  },
  {
    icon: Scissors,
    category: "EDITING",
    title: "Smart Scene Detection",
    description:
      "AI identifies key moments and cuts silence automatically. First cut to final cut, no grind.",
  },
  {
    icon: AudioWaveform,
    category: "AUDIO",
    title: "One-Click Audio Cleanup",
    description:
      "Remove background noise, enhance voice clarity, and balance levels—all in a single click.",
  },
  {
    icon: Download,
    category: "EXPORT",
    title: "Export Anywhere, Instantly",
    description:
      "Optimized presets for YouTube, TikTok, and Instagram. Any format, any resolution, in seconds.",
  },
];

const Features = () => {
  return (
    <section className="py-section-sm md:py-section relative" id="features">
      <div className="mx-auto max-w-content px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-24"
        >
          <h2 className="text-section-title md:text-[48px] md:leading-[1.15] font-semibold text-white mb-4">
            Everything you need to edit like a pro
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Professional-grade AI tools that run entirely on your device.
          </p>
        </motion.div>

        {/* Features grid — 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16 md:gap-y-24">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
            >
              {/* Video placeholder */}
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] aspect-video mb-6 flex items-center justify-center">
                <feature.icon className="w-8 h-8 text-muted-foreground/40" />
              </div>

              {/* Category label */}
              <span className="text-xs font-medium tracking-widest text-primary uppercase mb-2 block">
                {feature.category}
              </span>

              {/* Title */}
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed text-[15px]">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
