import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { N8nWorkflowBlock } from "@/components/ui/n8n-workflow-block-shadcnui";

const categories: Array<{
  id: string;
  name: string;
  title: string;
  desc: string;
  bg: string;
  video?: string;
}> = [
  {
    id: "vfx",
    name: "Story Telling",
    title: "Canvas",
    desc: "Restructure your edit on an infinite canvas. Every beat visible, every cut moveable.",
    bg: "from-blue-900/40",
    video: "/5408604_Coll_wavebreak_People.mp4",
  },
  {
    id: "fashion",
    name: "Branding",
    title: "Business DNA",
    desc: "Feed Zenvi your brand. Every export inherits your fonts, colors, and look.",
    bg: "from-purple-900/40",
    video: "/6010454_4k_Beautiful_3840x2160.mp4",
  },
  {
    id: "advertising",
    name: "Directors",
    title: "Don't Start from Scratch",
    desc: "Editing styles as prompts. Pick a director, get a cut in their voice.",
    bg: "from-amber-900/40",
    video: "/6034682_Business_Up_3840x2160.mp4",
  },
  {
    id: "photography",
    name: "Motion Graphics",
    title: "Animation at Your Fingertips",
    desc: "Type the title. Get the animation. Your fonts, your motion, exported clean.",
    bg: "from-emerald-900/40",
    video: "/190317-887815641.mp4",
  },
  {
    id: "concepting",
    name: "Camera Motion",
    title: "Shoot First Direct Later",
    desc: "Add pans, pushes, and dollies to static shots. Direct after the shoot.",
    bg: "from-rose-900/40",
    video: "/15181254_1920_1080_25fps.mp4",
  },
  {
    id: "branding",
    name: "3D Motion",
    title: "New Enviornments",
    desc: "3D scenes from 2D footage. Move the camera without a reshoot.",
    bg: "from-indigo-900/40",
    video: "/157022-813913004_medium.mp4",
  },
  {
    id: "motion",
    name: "Colorization",
    title: "Cinematic Color Grading",
    desc: "AI grades across shots. You keep the dials.",
    bg: "from-fuchsia-900/40",
    video: "/0_Whale_Shark_Shark_3840x2160.mp4",
  },
  {
    id: "architecture",
    name: "Teams",
    title: "Work Together Anywhere",
    desc: "Share projects without uploading footage. Cloud is opt-in, not default.",
    bg: "from-slate-900/40",
    video: "/205193-926528071_small.mp4",
  },
];

function CategoryTitle({ category, index, activeIndex, setActiveIndex }: { category: typeof categories[0], index: number, activeIndex: number, setActiveIndex: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-50% 0px -50% 0px" });

  useEffect(() => {
    if (isInView) {
      setActiveIndex(index);
    }
  }, [isInView, index, setActiveIndex]);

  const isActive = activeIndex === index;

  return (
    <div ref={ref} className="h-[25vh] md:h-[30vh] flex items-center">
      <motion.h2
        animate={{
          color: isActive ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.15)",
          scale: isActive ? 1 : 0.95,
          x: isActive ? 0 : -10
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-[48px] md:text-[64px] lg:text-[80px] font-medium tracking-tight cursor-default"
      >
        {category.name}
      </motion.h2>
    </div>
  );
}

export default function FloraWorkflows() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="features" className="relative bg-black w-full" style={{ height: `${categories.length * 30 + 100}vh` }}>

      {/* Sticky Background & Right Side */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex">

        {/* Dynamic Background — full-bleed video for categories that have one,
            gradient fallback (matches original look) for those that don't. */}
        <AnimatePresence mode="wait">
          {categories[activeIndex].video ? (
            <motion.div
              key={`video-${activeIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <video
                key={categories[activeIndex].video}
                src={categories[activeIndex].video}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </motion.div>
          ) : (
            <motion.div
              key={`gradient-${activeIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className={`absolute inset-0 bg-gradient-to-br ${categories[activeIndex].bg} to-black opacity-60`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dark overlay to ensure text readability — left stays solid black, right fades to reveal video */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30" />

        {/* Content Grid */}
        <div className="absolute inset-0 max-w-[1400px] mx-auto px-6 md:px-12 flex pt-24 md:pt-32 pointer-events-none">

          {/* Left Column Spacer */}
          <div className="w-[45%] lg:w-1/2" />

          {/* Right Column Sticky Media */}
          <div className="w-[55%] lg:w-1/2 h-full flex flex-col justify-center pb-32 pointer-events-auto pl-8 relative z-10">
            <div className="bg-black/80 backdrop-blur-xl rounded-[24px] w-full aspect-[16/10] border border-white/5 relative overflow-hidden shadow-2xl flex items-center justify-center">
              {/* Dot Grid inside the black rectangle */}
              <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  {categories[activeIndex].id === "vfx" ? (
                    <div className="absolute inset-0 w-full h-full p-1.5 flex items-center justify-center bg-[#050505]">
                      <N8nWorkflowBlock />
                    </div>
                  ) : (
                    <>
                      {/* Floating Node Placeholders */}
                      <div className="absolute w-[25%] aspect-[3/4] bg-white/10 rounded-xl border border-white/20 shadow-2xl -translate-x-32 -translate-y-12 overflow-hidden flex items-center justify-center">
                        <span className="text-white/30 text-xs font-medium">Source</span>
                      </div>
                      {/* Spline/Line */}
                      <svg className="absolute w-64 h-32 text-white/20" style={{ left: "30%", top: "40%" }}>
                        <path d="M 0 0 C 100 0, 50 100, 150 100" fill="transparent" stroke="currentColor" strokeWidth="1" />
                        <path d="M 0 0 C 100 0, 50 -80, 150 -80" fill="transparent" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <div className="absolute w-[25%] aspect-[3/4] bg-white/10 rounded-xl border border-white/20 shadow-2xl translate-x-32 -translate-y-24 overflow-hidden flex items-center justify-center">
                        <span className="text-white/30 text-xs font-medium">Node A</span>
                      </div>
                      <div className="absolute w-[25%] aspect-[3/4] bg-white/10 rounded-xl border border-white/20 shadow-2xl translate-x-32 translate-y-16 overflow-hidden flex items-center justify-center">
                        <span className="text-white/30 text-xs font-medium">Node B</span>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right Column Sticky Footer */}
            <div className="mt-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="text-white text-[18px] font-medium tracking-tight">{categories[activeIndex].title}</h3>
                  <p className="text-white/60 text-[14px] mt-2 max-w-md">{categories[activeIndex].desc}</p>
                </motion.div>
              </AnimatePresence>
              <button className="mt-5 bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-white/90 px-5 py-2 rounded-full text-[12px] font-medium backdrop-blur-sm">
                Explore this Flow
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Native Scrolling List Layer */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex h-full">
          {/* Left Column Native Scrolling List */}
          <div className="w-[45%] lg:w-1/2 pointer-events-auto">

            {/* Left Column Intro Header (Scrolls naturally) */}
            <div className="pt-24 md:pt-32 pb-8 md:pb-16 flex flex-col">
              <h2 className="text-[24px] md:text-[28px] text-white font-medium tracking-tight">
                One Timeline. Every Tool.
              </h2>
              <p className="text-white/60 text-[15px] max-w-sm mt-3 leading-relaxed">
                Swap an environment. Remove an object. Recast an actor. The shoot you couldn't afford, after the shoot.
              </p>
              <div className="flex items-center gap-6 mt-6">
                <button className="bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-white/90 px-5 py-2 rounded-full text-[13px] font-medium backdrop-blur-sm">
                  Get started for free
                </button>
                <button className="text-white/60 hover:text-white transition-colors text-[13px] font-medium">
                  See all workflows
                </button>
              </div>
            </div>

            {categories.map((c, i) => (
              <CategoryTitle key={c.id} index={i} category={c} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
            ))}
            {/* Spacer so the last item reaches the top/middle */}
            <div className="h-[60vh]" />
          </div>
        </div>
      </div>

    </section>
  );
}
