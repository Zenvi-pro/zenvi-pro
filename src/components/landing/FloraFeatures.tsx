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

              {/* Video Area */}
              <div className="px-6 h-[240px] md:h-[280px] w-full relative">
                <div className="w-full h-full bg-[#0f0f0f] rounded-t-xl border-x border-t border-white/5 relative overflow-hidden group-hover:border-white/10 transition-colors">
                  <video
                    src="/UGC_content.MP4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  {/* Decorative faint glow on top of video */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
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
