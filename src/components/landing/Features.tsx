import { useEffect, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  Video,
  Scissors,
  GitBranch,
  Sparkles,
} from "lucide-react";

type Feature = {
  icon: ComponentType<{ className?: string }>;
  category: string;
  title: string;
  description: string;
  image?: string;
  video?: string;
  videos?: string[];
  videoContain?: boolean;
};

const features: Feature[] = [
  {
    icon: Zap,
    category: "PERFORMANCE",
    title: "Instant AI Edits",
    description:
      "See changes in real time. No rendering queues, no waiting—edits happen the moment you make them.",
    image: "/instant-ai-edits.png",
  },
  {
    icon: Shield,
    category: "PRIVACY",
    title: "100% Local Processing",
    description:
      "Every frame stays on your device. No cloud uploads, no third-party access, no data collection.",
    image: "/local-processing-editor.png",
  },
  {
    icon: Video,
    category: "CONTENT",
    title: "Explainer Videos & Product Demos",
    description:
      "Make After Effects–style explainer videos and product demos almost instantly. AI-powered motion graphics and transitions—no templates, no waiting.",
    video: "/product_demo.mp4",
  },
  {
    icon: Scissors,
    category: "EDITING",
    title: "Smart Scene Detection",
    description:
      "AI identifies key moments and cuts silence automatically. First cut to final cut, no grind.",
    video: "/smart_detection.mp4",
  },
  {
    icon: GitBranch,
    category: "VERSION CONTROL",
    title: "Control Hundreds of Versions",
    description:
      "Manage hundreds of versions of the same project. Compare any two side by side, revert to a specific step, or change a single edit—all with one click.",
    video: "/version_control.mp4",
  },
  {
    icon: Sparkles,
    category: "CONTENT",
    title: "UGC-Style Content at Scale",
    description:
      "Create authentic, scroll-stopping UGC for brands and social. Repurpose one take into dozens of formats—testimonials, unboxings, tutorials—without re-recording.",
    videos: ["/UGC_content.MP4", "/UGC_content_2.MP4", "/UGC_content_3.MP4"],
    videoContain: true,
  },
];

const Features = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const headingWords = "Everything you need to edit like a pro".split(" ");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, []);

  const activeFeature = features[activeIndex];

  const goToSlide = (index: number) => {
    const normalizedIndex = (index + features.length) % features.length;
    setActiveIndex(normalizedIndex);
  };

  const renderFeatureVisual = (feature: Feature) => {
    if (Array.isArray(feature.videos) && feature.videos.length > 0) {
      return (
        <div className="relative flex gap-2 rounded-lg border border-white/[0.06] overflow-hidden bg-[#0A0A0A] p-2 shadow-none transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.35),0_24px_48px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(99,102,241,0.2)] group-hover:border-primary/30">
          {feature.videos.map((src, i) => (
            <div key={i} className="relative flex-1 min-w-0 aspect-[9/16] rounded overflow-hidden">
              <video
                src={src}
                className="absolute inset-0 h-full w-full object-contain"
                muted
                loop
                playsInline
                autoPlay
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
            </div>
          ))}
        </div>
      );
    }

    if (feature.video) {
      return (
        <div
          className={`relative rounded-lg border border-white/[0.06] overflow-hidden bg-[#0A0A0A] shadow-none transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.35),0_24px_48px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(99,102,241,0.2)] group-hover:border-primary/30 ${feature.videoContain ? "aspect-[9/16] max-h-[340px] mx-auto" : "aspect-video"}`}
        >
          <video
            src={feature.video}
            className={`absolute inset-0 h-full w-full ${feature.videoContain ? "object-contain" : "object-cover object-top"}`}
            muted
            loop
            playsInline
            autoPlay
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
        </div>
      );
    }

    if (feature.image) {
      return (
        <div className="relative rounded-lg border border-white/[0.06] overflow-hidden aspect-video bg-[#0A0A0A] shadow-none transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.35),0_24px_48px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(99,102,241,0.2)] group-hover:border-primary/30">
          <img
            src={feature.image}
            alt={feature.title}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] aspect-video flex items-center justify-center">
        <feature.icon className="w-8 h-8 text-muted-foreground/40" />
      </div>
    );
  };

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
            {headingWords.map((word, index) => (
              <motion.span
                key={`${word}-${index}`}
                className="inline-block mr-[0.35ch]"
                initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.045,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {word}
              </motion.span>
            ))}
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Professional-grade AI tools that run entirely on your device.
          </motion.p>
        </motion.div>

        {/* Features carousel */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-4 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="group">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`visual-${activeIndex}`}
                    className="mb-0"
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -8 }}
                    transition={{ duration: 0.35 }}
                    whileHover={{
                      scale: 1.02,
                      rotateX: 2,
                      rotateY: -4,
                      z: 12,
                      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                    }}
                    style={{ perspective: 1000, transformStyle: "preserve-3d" }}
                  >
                    {renderFeatureVisual(activeFeature)}
                  </motion.div>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`text-${activeIndex}`}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-xs font-medium tracking-widest text-primary uppercase mb-3 block">
                    {activeFeature.category}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-semibold text-white mb-4">
                    {activeFeature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px] md:text-base mb-6">
                    {activeFeature.description}
                  </p>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.02] px-3 py-1.5">
                    <activeFeature.icon className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {activeIndex + 1} / {features.length}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-7 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {features.map((feature, index) => (
                  <button
                    key={feature.title}
                    type="button"
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to ${feature.title}`}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      index === activeIndex
                        ? "w-8 bg-primary"
                        : "w-2.5 bg-white/25 hover:bg-white/45"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToSlide(activeIndex - 1)}
                  aria-label="Previous feature"
                  className="h-10 w-10 rounded-full border border-white/[0.14] bg-white/[0.02] text-white/80 hover:bg-white/[0.06] transition-colors inline-flex items-center justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goToSlide(activeIndex + 1)}
                  aria-label="Next feature"
                  className="h-10 w-10 rounded-full border border-white/[0.14] bg-white/[0.02] text-white/80 hover:bg-white/[0.06] transition-colors inline-flex items-center justify-center"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
