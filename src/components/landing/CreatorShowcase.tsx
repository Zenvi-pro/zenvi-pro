import { useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

/**
 * Placeholder data — swap each entry with a real edited Zenvi piece.
 * Drop a video into /public/showcase/ and point `src` at it, or set `poster`
 * to a thumbnail and leave `src` blank for a still-image card.
 */
type ShowcaseItem = {
  title: string;
  creator: string;
  category: string;
  // Tailwind gradient applied while no real asset is wired up.
  placeholderGradient: string;
  src?: string;
  poster?: string;
  href?: string;
};

const items: ShowcaseItem[] = [
  {
    title: "Sundown Run",
    creator: "@marcusedits",
    category: "Creator vlog",
    placeholderGradient: "from-amber-900/40 via-rose-950/30 to-zinc-950",
  },
  {
    title: "Origins: Field Notes",
    creator: "Lou & Reeve",
    category: "Short documentary",
    placeholderGradient: "from-teal-900/40 via-slate-900/30 to-zinc-950",
  },
  {
    title: "The Launch Film",
    creator: "Linear Studio",
    category: "Brand campaign",
    placeholderGradient: "from-indigo-900/40 via-blue-950/30 to-zinc-950",
  },
  {
    title: "How We Beat Game 7",
    creator: "Pace Studios",
    category: "Sports cut",
    placeholderGradient: "from-orange-900/40 via-red-950/30 to-zinc-950",
  },
  {
    title: "A Letter to My Younger Self",
    creator: "@anissaolyfilms",
    category: "Personal essay",
    placeholderGradient: "from-violet-900/40 via-fuchsia-950/30 to-zinc-950",
  },
  {
    title: "Drowsy Sunday",
    creator: "Maddie Lin",
    category: "Comedy sketch",
    placeholderGradient: "from-emerald-900/40 via-cyan-950/30 to-zinc-950",
  },
];

const ShowcaseCard = ({ item, index }: { item: ShowcaseItem; index: number }) => {
  const [isHovered, setIsHovered] = useState(false);

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
        {item.src ? (
          <video
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            src={item.src}
            poster={item.poster}
            autoPlay={isHovered}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${item.placeholderGradient} transition-transform duration-700 group-hover:scale-105`}
          />
        )}

        {/* Subtle film grain via radial gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_60%)]" />

        {/* Top-left category tag */}
        <div className="absolute left-4 top-4 z-10">
          <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/85 backdrop-blur-md">
            {item.category}
          </span>
        </div>

        {/* Play icon overlay — only when real video is present */}
        {item.src && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-2xl">
              <Play className="h-5 w-5 fill-black text-black" />
            </div>
          </div>
        )}

        {/* Bottom gradient + title lockup */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5">
          <h3 className="text-lg font-semibold leading-tight text-white">{item.title}</h3>
          <p className="mt-0.5 text-sm text-white/65">{item.creator}</p>
        </div>
      </div>
    </motion.div>
  );

  return item.href ? (
    <a href={item.href} className="block focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black rounded-2xl">
      {card}
    </a>
  ) : (
    card
  );
};

const CreatorShowcase = () => {
  return (
    <section
      id="showcase"
      className="relative bg-[#0A0A0A] py-section-sm md:py-section"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-[11px] font-medium uppercase tracking-[0.24em] text-white/55"
          >
            Made with Zenvi
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-3xl font-bold leading-[1.05] tracking-[-0.02em] text-white md:text-5xl"
          >
            From the first frame to the final cut.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mx-auto mt-4 max-w-2xl text-balance text-base text-white/65 md:text-lg"
          >
            Real work from editors using Zenvi — late-night creator content,
            brand campaigns, documentaries, and the occasional feature.
          </motion.p>
        </div>

        {/* Showcase grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <ShowcaseCard key={item.title} item={item} index={i} />
          ))}
        </div>

        {/* Soft footer note + CTA */}
        <div className="mt-14 flex flex-col items-center justify-center gap-3 text-center md:mt-20">
          <p className="text-sm text-white/55">
            Have you made something with Zenvi? We'd love to feature it.
          </p>
          <a
            href="https://x.com/pro_zenvi"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-white underline-offset-4 hover:underline"
          >
            Send it our way →
          </a>
        </div>
      </div>
    </section>
  );
};

export default CreatorShowcase;
