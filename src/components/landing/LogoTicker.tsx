import { motion } from "framer-motion";

const partners = [
  { name: "Superteam Canada", url: "https://superteam.ca/" },
  { name: "Ajna Materials", url: "https://www.ajnamaterials.com/" },
  { name: "Passport", url: "https://www.passportanywhere.co/" },
];

const items = [...partners, ...partners, ...partners, ...partners];

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

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#0A0A0A] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#0A0A0A] to-transparent pointer-events-none" />

        <div className="flex overflow-hidden">
          <div className="ticker-track flex shrink-0 items-center gap-16">
            {items.map((partner, i) => (
              <a
                key={i}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-medium text-white/20 hover:text-white transition-colors duration-200 whitespace-nowrap select-none tracking-wide shrink-0"
              >
                {partner.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LogoTicker;
