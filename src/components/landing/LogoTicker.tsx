import { motion } from "framer-motion";

/* Placeholder company names — replace with real logos/SVGs when available */
const logos = [
  "Acme Studios",
  "Vortex Media",
  "Pixel & Frame",
  "RedThread",
  "Luminar Creative",
  "CutAbove",
  "Frameshift",
  "Motionhaus",
  "SilverReel",
  "Epoch Films",
];

const LogoTicker = () => {
  return (
    <section className="py-section-sm md:py-section relative overflow-hidden">
      <div className="mx-auto max-w-content px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mb-10"
        >
          Used by creators at
        </motion.p>
      </div>

      {/* Ticker */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#0A0A0A] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#0A0A0A] to-transparent pointer-events-none" />

        <div className="flex overflow-hidden">
          <div className="ticker-track flex shrink-0 items-center gap-16">
            {/* Double the logos for seamless loop */}
            {[...logos, ...logos].map((name, i) => (
              <span
                key={i}
                className="text-base font-medium text-white/20 whitespace-nowrap select-none tracking-wide"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LogoTicker;
