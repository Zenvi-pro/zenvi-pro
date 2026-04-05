import { motion } from "framer-motion";
import { ThumbnailsCarousel } from "@/components/ui/signature";

const Features = () => {
  const headingWords = "Everything you need to edit like a pro".split(" ");

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

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-4 md:p-8">
            <ThumbnailsCarousel />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
