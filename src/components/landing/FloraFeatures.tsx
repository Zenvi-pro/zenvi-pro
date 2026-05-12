import { useState } from "react";
import { motion } from "framer-motion";

const cards = [
  {
    num: "01",
    title: "Ideate",
    subtitle: "Explore 100s of possibilities",
    desc: "Text, image, and video models in one\nplace. No tab-switching, no limits.",
    videoSrc: "/product_demo.mp4",
  },
  {
    num: "02",
    title: "Iterate",
    subtitle: 'Get to "final" faster',
    desc: "Iterate in real-time with the whole team.",
    videoSrc: "/smart_detection.mp4",
  },
  {
    num: "03",
    title: "Scale",
    subtitle: "Create scalable workflows",
    desc: "Turn a single concept into hundreds\nof production-grade assets.",
    videoSrc: "/UGC_content.MP4",
  }
];

export default function FloraFeatures() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="bg-black text-white py-24">
      <div className="max-w-[1240px] mx-auto px-6">
        
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-[32px] md:text-[40px] font-medium tracking-tight mb-4 text-white">
            Never let a good idea go unexplored.
          </h2>
          <p className="text-[17px] text-white/50 max-w-3xl leading-relaxed">
            Meet Zenvi, the creative agent inside Zenvi that thinks with you, builds with you, and never runs out of directions to try.
          </p>
        </div>

        {/* Flex Accordion Grid */}
        <div className="flex flex-col md:flex-row gap-5 h-[800px] md:h-[600px]">
          {cards.map((card, i) => {
            const isHovered = hoveredIndex === i;
            const isAnyHovered = hoveredIndex !== null;
            
            return (
              <motion.div
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                animate={{
                  flex: isHovered ? 2.5 : 1,
                  opacity: isAnyHovered && !isHovered ? 0.35 : 1,
                }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-[24px] border border-white/10 group cursor-pointer"
                style={{ flexBasis: 0 }}
              >
                {/* Full Bleed Video Background */}
                <div className="absolute inset-0 bg-[#0A0A0A]">
                  <video
                    src={card.videoSrc}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover scale-105"
                  />
                  {/* Subtle Grid Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                  
                  {/* Vignette Gradients for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 opacity-90 pointer-events-none" />
                </div>

                {/* Content Container */}
                <div className="relative w-full h-full flex flex-col justify-between p-8 pointer-events-none z-10">
                  {/* Top Header */}
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-[28px] font-medium tracking-tight">{card.num}</span>
                    <span className="text-white text-[28px] font-medium tracking-tight">{card.title}</span>
                  </div>

                  {/* Bottom Content */}
                  <div>
                    <h3 className="text-white text-[20px] font-medium tracking-tight mb-2">
                      {card.subtitle}
                    </h3>
                    <motion.p 
                      animate={{ opacity: isHovered ? 1 : 0.6 }}
                      transition={{ duration: 0.4 }}
                      className="text-white/60 text-[15px] leading-relaxed whitespace-pre-line max-w-[300px]"
                    >
                      {card.desc}
                    </motion.p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
