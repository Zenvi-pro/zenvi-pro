import { motion } from "framer-motion";

const cards = [
  {
    num: "01",
    title: "Ideate",
    subtitle: "Explore 100s of possibilities",
    desc: "Text, image, and video models in one\nplace. No tab-switching, no limits.",
  },
  {
    num: "02",
    title: "Iterate",
    subtitle: "Get to \"final\" faster",
    desc: "Iterate in real-time with the whole team.",
  },
  {
    num: "03",
    title: "Scale",
    subtitle: "Create scalable workflows",
    desc: "Turn a single concept into hundreds\nof production-grade assets.",
  }
];

export default function FloraFeatures() {
  return (
    <section className="bg-black text-white py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        
        {/* Header */}
        <div className="mb-16">
          <h2 className="text-[32px] md:text-[40px] font-medium tracking-tight mb-4 text-white">
            Never let a good idea go unexplored.
          </h2>
          <p className="text-[17px] text-white/50 max-w-3xl leading-relaxed">
            Meet Zenvi, the creative agent inside Zenvi that thinks with you, builds with you, and never runs out of directions to try.
          </p>
        </div>

        {/* 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex flex-col bg-[#050505] border border-white/10 rounded-[24px] overflow-hidden group"
            >
              
              {/* Card Header */}
              <div className="p-8 pb-6 flex items-baseline gap-2">
                <span className="text-white/40 text-[32px] font-medium">{card.num}</span>
                <span className="text-white text-[32px] font-medium tracking-tight">{card.title}</span>
              </div>

              {/* Video Placeholder Area */}
              <div className="px-6 h-[240px] md:h-[280px] w-full relative">
                <div className="w-full h-full bg-[#0f0f0f] rounded-t-xl border-x border-t border-white/5 relative overflow-hidden group-hover:border-white/10 transition-colors">
                  {/* Subtle grid or gradient to simulate the canvas space */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]" />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white/20 text-xs font-medium tracking-widest uppercase mb-2">Video Placeholder</span>
                    <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white/40 border-b-[6px] border-b-transparent ml-1" />
                    </div>
                  </div>
                  
                  {/* Decorative faint glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-8 pt-6 flex flex-col gap-2 mt-auto z-10 bg-[#050505]">
                <h3 className="text-white text-[18px] font-medium tracking-tight">
                  {card.subtitle}
                </h3>
                <p className="text-white/50 text-[15px] leading-relaxed whitespace-pre-line">
                  {card.desc}
                </p>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
