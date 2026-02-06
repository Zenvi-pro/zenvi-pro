import { motion } from "framer-motion";
import { 
  Zap, 
  Shield, 
  Captions, 
  Scissors, 
  AudioWaveform, 
  Download 
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Real-Time Editing",
    description: "See changes instantly with live preview. No rendering wait times—your edits happen in real-time.",
  },
  {
    icon: Shield,
    title: "Runs Locally",
    description: "All processing happens on your device. Your videos never leave your machine—complete privacy.",
  },
  {
    icon: Captions,
    title: "Auto-Subtitles",
    description: "AI-generated captions in seconds. Support for 50+ languages with perfect timing sync.",
  },
  {
    icon: Scissors,
    title: "Smart Clipping",
    description: "Automatic scene detection finds the best moments. AI identifies key segments instantly.",
  },
  {
    icon: AudioWaveform,
    title: "Audio Cleanup",
    description: "Remove background noise with one click. Enhance voice clarity and balance audio levels.",
  },
  {
    icon: Download,
    title: "Instant Export",
    description: "Export to any format in seconds. Optimized presets for every platform—YouTube, TikTok, Instagram.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const Features = () => {
  return (
    <section className="py-24 relative" id="features">
      {/* Background gradient */}
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
            Everything you need to{" "}
            <span className="gradient-text">create magic</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional-grade AI tools that run entirely on your device. No cloud, no limits.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="feature-card group cursor-pointer"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:neon-glow-purple transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover gradient line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
