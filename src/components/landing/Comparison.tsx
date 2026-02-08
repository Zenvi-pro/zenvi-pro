import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const rows = [
  {
    feature: "Processing Speed",
    zenvi: "Instant — runs on your GPU",
    cloud: "Minutes — upload, wait, download",
  },
  {
    feature: "Privacy",
    zenvi: "100% local — footage never leaves",
    cloud: "Uploaded to third-party servers",
  },
  {
    feature: "File Size Limit",
    zenvi: "None — limited only by your disk",
    cloud: "Capped at 2–5 GB per file",
  },
  {
    feature: "Internet Required",
    zenvi: "No — works fully offline",
    cloud: "Yes — every operation needs a connection",
  },
  {
    feature: "Latency",
    zenvi: "Zero — real-time preview",
    cloud: "High — round-trip to the server",
  },
  {
    feature: "Cost Model",
    zenvi: "Flat subscription — unlimited use",
    cloud: "Per-minute or per-export fees",
  },
];

const Comparison = () => {
  return (
    <section className="py-section-sm md:py-section relative" id="comparison">
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
            Why local beats cloud
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Cloud editors make you wait. Zenvi makes you faster.
          </p>
        </motion.div>

        {/* Desktop table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden md:block"
        >
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="px-6 py-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Feature
                </span>
              </div>
              <div className="px-6 py-4 border-l border-white/[0.06]">
                <span className="text-sm font-semibold text-primary">
                  Zenvi (Local)
                </span>
              </div>
              <div className="px-6 py-4 border-l border-white/[0.06]">
                <span className="text-sm font-medium text-muted-foreground">
                  Cloud Editors
                </span>
              </div>
            </div>

            {/* Rows */}
            {rows.map((row, index) => (
              <div
                key={index}
                className={`grid grid-cols-3 ${
                  index < rows.length - 1
                    ? "border-b border-white/[0.04]"
                    : ""
                }`}
              >
                <div className="px-6 py-4">
                  <span className="text-sm text-white font-medium">
                    {row.feature}
                  </span>
                </div>
                <div className="px-6 py-4 border-l border-white/[0.06] flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-white/80">{row.zenvi}</span>
                </div>
                <div className="px-6 py-4 border-l border-white/[0.06] flex items-start gap-2">
                  <X className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">
                    {row.cloud}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {rows.map((row, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              className="rounded-lg border border-white/[0.06] p-5"
            >
              <h4 className="text-sm font-semibold text-white mb-3">
                {row.feature}
              </h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-white/80">{row.zenvi}</span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">
                    {row.cloud}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Comparison;
