// FloraModels imports cleaned
// Provider Data
const ALL_PROVIDERS = [
  {
    company: "Google",
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
    bg: "from-orange-900/40",
    models: [
      { name: "Wan2.6", desc: "Culturally tuned image model" }
    ]
  },
  {
    company: "OpenAI",
    bg: "from-emerald-900/40",
    models: [
      { name: "GPT-5.4", desc: "State-of-the-art multimodal AI" },
      { name: "Sora 2", desc: "Cinematic videos" },
      { name: "GPT Image", desc: "Detailed image editing" }
    ]
  },
  {
    company: "Black Forest Labs",
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
    bg: "from-indigo-900/40",
    models: [
      { name: "Stable Diffusion 3.5", desc: "Open, versatile image synthesis" }
    ]
  },
  {
    company: "Hailuo AI",
    bg: "from-slate-800/60",
    models: [
      { name: "Minimax Hailuo", desc: "General-purpose image generator" },
      { name: "Minimax Hailuo 02 Pro", desc: "Enhanced precision image generation" }
    ]
  },
  {
    company: "KlingAI",
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
    bg: "from-cyan-900/40",
    models: [
      { name: "Seedream 5.0", desc: "Multimodal image generation and editing" },
      { name: "Seedance 1.5", desc: "Multi-shot videos from text or images" }
    ]
  }
];

import FluidExpandingGrid from "@/components/ui/fluid-expanding-grid";

// Chunk the array into sizes of 3, 3, 3 for the rotating pods
const GROUP_1 = ALL_PROVIDERS.slice(0, 3).map(p => ({ ...p, id: p.company }));
const GROUP_2 = ALL_PROVIDERS.slice(3, 6).map(p => ({ ...p, id: p.company }));
const GROUP_3 = ALL_PROVIDERS.slice(6, 9).map(p => ({ ...p, id: p.company }));

export default function FloraModels() {
  return (
    <section className="bg-black py-32 border-t border-white/5 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6">
        
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

        {/* Localized Fluid Expanding Grids (Rotating Pods) */}
        <div className="flex flex-col gap-6 w-full">
          <FluidExpandingGrid items={GROUP_1} id="flora-pod-1" />
          <FluidExpandingGrid items={GROUP_2} id="flora-pod-2" />
          <FluidExpandingGrid items={GROUP_3} id="flora-pod-3" />
        </div>

      </div>
    </section>
  );
}
