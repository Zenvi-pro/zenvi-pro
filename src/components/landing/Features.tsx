import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  Video,
  Scissors,
  GitBranch,
  Sparkles,
} from "lucide-react";
const features = [
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
              className="group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
            >
              {/* Feature visual: videos (multiple), video, image with 3D hover, or icon placeholder */}
              {"videos" in feature && Array.isArray(feature.videos) && feature.videos.length > 0 ? (
                <motion.div
                  className="mb-6"
                  initial={false}
                  whileHover={{
                    scale: 1.02,
                    rotateX: 2,
                    rotateY: -4,
                    z: 12,
                    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                  }}
                  style={{ perspective: 1000, transformStyle: "preserve-3d" }}
                >
                  <div className="relative flex gap-2 rounded-lg border border-white/[0.06] overflow-hidden bg-[#0A0A0A] p-2 shadow-none transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.35),0_24px_48px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(99,102,241,0.2)] group-hover:border-primary/30">
                    {feature.videos.map((src, i) => (
                      <div
                        key={i}
                        className="relative flex-1 min-w-0 aspect-[9/16] rounded overflow-hidden"
                      >
                        <video
                          src={src}
                          className="absolute inset-0 h-full w-full object-contain grayscale transition-all duration-500 group-hover:grayscale-0"
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
                </motion.div>
              ) : "video" in feature && feature.video ? (
                <motion.div
                  className="mb-6"
                  initial={false}
                  whileHover={{
                    scale: 1.02,
                    rotateX: 2,
                    rotateY: -4,
                    z: 12,
                    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                  }}
                  style={{ perspective: 1000, transformStyle: "preserve-3d" }}
                >
                  <div className={`relative rounded-lg border border-white/[0.06] overflow-hidden bg-[#0A0A0A] shadow-none transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.35),0_24px_48px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(99,102,241,0.2)] group-hover:border-primary/30 ${"videoContain" in feature && feature.videoContain ? "aspect-[9/16] max-h-[340px] mx-auto" : "aspect-video"}`}>
                    <video
                      src={feature.video}
                      className={`absolute inset-0 h-full w-full grayscale transition-all duration-500 group-hover:grayscale-0 ${"videoContain" in feature && feature.videoContain ? "object-contain" : "object-cover object-top"}`}
                      muted
                      loop
                      playsInline
                      autoPlay
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
                  </div>
                </motion.div>
              ) : "image" in feature && feature.image ? (
                <motion.div
                  className="mb-6"
                  initial={false}
                  whileHover={{
                    scale: 1.02,
                    rotateX: 2,
                    rotateY: -4,
                    z: 12,
                    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                  }}
                  style={{ perspective: 1000, transformStyle: "preserve-3d" }}
                >
                  <div className="relative rounded-lg border border-white/[0.06] overflow-hidden aspect-video bg-[#0A0A0A] shadow-none transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.35),0_24px_48px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(99,102,241,0.2)] group-hover:border-primary/30">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="absolute inset-0 h-full w-full object-cover object-top grayscale transition-all duration-500 group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
                  </div>
                </motion.div>
              ) : (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] aspect-video mb-6 flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}

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
