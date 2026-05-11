import { motion } from "framer-motion";

const providers = [
  {
    company: "Google",
    colSpan: "md:col-span-2",
    rowSpan: "row-span-1",
    bg: "from-blue-900/40",
    models: [
      { name: "Nano Banana 2", desc: "State-of-the-art image generation" },
      { name: "Nano Banana Pro", desc: "Photorealistic image generation" },
      { name: "Gemini 3 Pro", desc: "Advanced multimodal reasoning" },
      { name: "Veo3", desc: "Cinematic long-form video" }
    ]
  },
  {
    company: "runway",
    colSpan: "md:col-span-1",
    rowSpan: "md:row-span-2",
    bg: "from-stone-800/60",
    models: [
      { name: "Aleph", desc: "Creative media foundation model" },
      { name: "Gen-4 Turbo", desc: "Real-time video generation" },
      { name: "References", desc: "Style/subject consistency from refs" },
      { name: "Act-Two", desc: "Narrative video storytelling" },
      { name: "Gen-3 Alpha", desc: "Cinematic video realism" }
    ]
  },
  {
    company: "Wan",
    colSpan: "md:col-span-1",
    rowSpan: "row-span-1",
    bg: "from-orange-900/40",
    models: [
      { name: "Wan2.6", desc: "Culturally tuned image model" }
    ]
  },
  {
    company: "OpenAI",
    colSpan: "md:col-span-1",
    rowSpan: "row-span-1",
    bg: "from-emerald-900/40",
    models: [
      { name: "GPT-5.4", desc: "State-of-the-art multimodal AI" },
      { name: "Sora 2", desc: "Cinematic videos" },
      { name: "GPT Image", desc: "Detailed image editing" }
    ]
  },
  {
    company: "Black Forest Labs",
    colSpan: "md:col-span-2",
    rowSpan: "row-span-1",
    bg: "from-red-900/40",
    models: [
      { name: "FLUX.2", desc: "Balanced photo/creative images" },
      { name: "FLUX Kontext Max", desc: "Multi-reference guided images" },
      { name: "FLUX Dev", desc: "Developer-focused generator" },
      { name: "FLUX Redux", "desc": "Image refinement and polish" },
      { name: "FLUX Depth", desc: "Depth-map guided images" },
      { name: "FLUX Canny", desc: "Edge-map controlled images" }
    ]
  },
  {
    company: "stability.ai",
    colSpan: "md:col-span-1",
    rowSpan: "row-span-1",
    bg: "from-indigo-900/40",
    models: [
      { name: "Stable Diffusion 3.5", desc: "Open, versatile image synthesis" }
    ]
  },
  {
    company: "Hailuo AI",
    colSpan: "md:col-span-1",
    rowSpan: "row-span-1",
    bg: "from-slate-800/60",
    models: [
      { name: "Minimax Hailuo", desc: "General-purpose image generator" },
      { name: "Minimax Hailuo 02 Pro", desc: "Enhanced precision image generation" }
    ]
  },
  {
    company: "Pika",
    colSpan: "md:col-span-1",
    rowSpan: "row-span-1",
    bg: "from-zinc-900/60",
    models: [
      { name: "Pika", desc: "Creative, fast video generation" }
    ]
  },
  {
    company: "Recraft",
    colSpan: "md:col-span-1",
    rowSpan: "row-span-1",
    bg: "from-fuchsia-900/40",
    models: [
      { name: "Recraft V4", desc: "Vector & design-oriented image generation" }
    ]
  },
  {
    company: "KlingAI",
    colSpan: "md:col-span-2",
    rowSpan: "row-span-1",
    bg: "from-blue-900/60",
    models: [
      { name: "Kling 3.0", desc: "Refined cinematic video model" },
      { name: "Kling 2.0 Master", desc: "Advanced cinematic video model" },
      { name: "Kling Pro 1.5", desc: "Prior-gen high-quality video model" },
      { name: "Kling Pro 1.6", desc: "High-quality video generation" }
    ]
  },
  {
    company: "ByteDance Seed",
    colSpan: "md:col-span-2",
    rowSpan: "row-span-1",
    bg: "from-cyan-900/40",
    models: [
      { name: "Seedream 5.0", desc: "Multimodal image generation and editing" },
      { name: "Seedance 1.5", desc: "Multi-shot videos from text or images" }
    ]
  },
  {
    company: "MOONVALLEY",
    colSpan: "md:col-span-1",
    rowSpan: "row-span-1",
    bg: "from-stone-900/80",
    models: [
      { name: "Marey", desc: "Commercially safe, production-grade video generation" }
    ]
  }
];

export default function FloraModels() {
  return (
    <section className="bg-black py-32 border-t border-white/5">
      <div className="max-w-[1200px] mx-auto px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-16 gap-6">
          <div>
            <h2 className="text-[28px] md:text-[36px] font-medium text-white tracking-tight mb-3">
              One subscription to rule them all.
            </h2>
            <p className="text-[17px] text-white/50 max-w-xl">
              One plan. 50+ models. Stay on the creative edge without chasing licenses.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-white/60 hover:text-white transition-colors text-[14px] font-medium flex items-center gap-2">
              Contact sales <span className="rotate-[-45deg]">&rarr;</span>
            </button>
            <button className="bg-white/10 hover:bg-white/20 border border-white/10 text-white h-11 px-6 rounded-full font-medium text-[14px] transition-colors">
              Sign up for free
            </button>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-min">
          {providers.map((provider, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={`relative bg-[#050505] rounded-3xl border border-white/10 overflow-hidden group min-h-[300px] flex flex-col justify-between ${provider.colSpan} ${provider.rowSpan}`}
            >
              {/* Media Placeholder Background */}
              <div className="absolute inset-0 z-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${provider.bg} to-black opacity-50`} />
                {/* Subtle overlay gradient to ensure text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
                {/* Fake play button placeholder for video */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
                  <div className="w-16 h-16 rounded-full border border-white flex items-center justify-center">
                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                  </div>
                </div>
              </div>

              {/* Company Logo/Name (Top Left) */}
              <div className="relative z-10 p-8">
                <h3 className="text-[24px] font-bold tracking-tight text-white shadow-black/50 drop-shadow-md">
                  {provider.company}
                </h3>
              </div>

              {/* Models List (Bottom) */}
              <div className="relative z-10 p-8 mt-auto grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {provider.models.map((model, j) => (
                  <div key={j} className="flex flex-col gap-0.5">
                    <h4 className="text-[13px] font-medium text-white shadow-black/50 drop-shadow-md">
                      {model.name}
                    </h4>
                    <p className="text-[11px] text-white/50 leading-snug">
                      {model.desc}
                    </p>
                  </div>
                ))}
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
