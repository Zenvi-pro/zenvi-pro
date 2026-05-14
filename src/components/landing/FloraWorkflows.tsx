import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VideoNodesWorkflowBuilder } from "@/components/ui/video-nodes-workflow-builder";
import { ImageComparisonSlider } from "@/components/ui/image-comparison-slider-horizontal";
import { SplineScene } from "@/components/ui/splite";
import { Interactive3DOrbitVideo } from "@/components/ui/interactive-3d-orbit-video";

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsLoggedIn(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setIsLoggedIn(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const ctaHref = isLoggedIn ? "/dashboard/download" : "/login?mode=signup";
  const ctaLabel = isLoggedIn ? "Download Now" : "Get started for free";

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
                    // Story Telling - movable video nodes connected by dotted lines matching original builder functionality
                    <div className="absolute inset-0 w-full h-full bg-[#050505]">
                      <VideoNodesWorkflowBuilder />
                    </div>
                  ) : categories[activeIndex].id === "motion" ? (
                    <div className="absolute inset-0 w-full h-full p-2 flex items-center justify-center bg-[#050505]">
                      <ImageComparisonSlider
                        leftImage="/shark_before.png"
                        rightImage="/shark_after.jpg"
                        altLeft="Before Colorization"
                        altRight="After Colorization"
                      />
                    </div>
                  ) : categories[activeIndex].id === "photography" ? (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#050505]">
                      <SplineScene 
                        scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                        className="w-full h-full"
                      />
                    </div>
                  ) : categories[activeIndex].id === "branding" ? (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#050505]">
                      <Interactive3DOrbitVideo 
                        videoSrc="/157022-813913004_medium.mp4"
                        className="w-full h-full"
                      />
                    </div>
                  ) : categories[activeIndex].id === "fashion" ? (
                    // Branding - Business DNA matrix preview
                    <div className="absolute inset-0 w-full h-full p-4 flex flex-col md:flex-row items-center gap-4 bg-[#050505] overflow-hidden">
                      {/* Sidebar Brand Presets */}
                      <div className="w-full md:w-1/3 bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2.5 justify-center">
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Brand DNA Engine</div>
                        <div className="flex items-center justify-between bg-black/40 p-1.5 rounded border border-white/5">
                          <span className="text-[10px] text-white/70">Palette</span>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#3275F8]" />
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                            <span className="w-2.5 h-2.5 rounded-full bg-white" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-black/40 p-1.5 rounded border border-white/5">
                          <span className="text-[10px] text-white/70">Font</span>
                          <span className="text-[10px] font-mono text-white font-bold">Outfit</span>
                        </div>
                        <div className="flex items-center justify-between bg-black/40 p-1.5 rounded border border-white/5">
                          <span className="text-[10px] text-white/70">Watermark</span>
                          <span className="text-[9px] bg-[#3275F8]/20 text-[#3275F8] px-1.5 py-0.5 rounded font-medium">Applied</span>
                        </div>
                      </div>

                      {/* Main Dynamic Video Output with Inherited Look */}
                      <div className="relative flex-1 w-full h-full rounded-xl overflow-hidden border border-white/15 bg-black">
                        <video src="/6010454_4k_Beautiful_3840x2160.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover opacity-90" />
                        {/* Live Watermark preview rendered directly on top */}
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#3275F8] animate-pulse" />
                          <span className="text-[9px] font-bold tracking-widest text-white uppercase font-sans">ZENVI BRAND</span>
                        </div>
                      </div>
                    </div>
                  ) : categories[activeIndex].id === "advertising" ? (
                    // Directors - Prompt Matrix
                    <div className="absolute inset-0 w-full h-full p-4 flex flex-col justify-between bg-[#050505] overflow-hidden">
                      {/* Looping Director Cut background video */}
                      <div className="absolute inset-0 opacity-70">
                        <video src="/6034682_Business_Up_3840x2160.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover scale-105" />
                        {/* Cinematic Letterbox overlays */}
                        <div className="absolute inset-x-0 top-0 h-8 bg-black/90 backdrop-blur-sm border-b border-white/10 flex items-center px-4 justify-between">
                          <span className="text-[9px] font-mono text-white/40">REC • 24FPS</span>
                          <span className="text-[9px] font-bold text-amber-400 tracking-widest uppercase">Director Mode Active</span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-black/90 backdrop-blur-sm border-t border-white/10" />
                      </div>

                      {/* Director Persona Presets floating bar */}
                      <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 mt-auto pb-2">
                        <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-md shadow-lg flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Tarantino Raw
                        </div>
                        <div className="bg-white/5 border border-white/10 text-white/50 px-3 py-1 rounded-full text-[10px] font-medium backdrop-blur-md">
                          Cyberpunk Grit
                        </div>
                        <div className="bg-white/5 border border-white/10 text-white/50 px-3 py-1 rounded-full text-[10px] font-medium backdrop-blur-md">
                          Wes Pastel
                        </div>
                      </div>
                    </div>
                  ) : categories[activeIndex].id === "concepting" ? (
                    // Camera Motion - Superimposed targeting bounding keyframe
                    <div className="absolute inset-0 w-full h-full bg-[#050505] overflow-hidden flex items-center justify-center p-2">
                      <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/10">
                        <video src="/15181254_1920_1080_25fps.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover opacity-80" />
                        
                        {/* Live AI Camera Framing Matrix Overlay */}
                        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                        
                        {/* Simulated AI dolly-zoom targeting bounding box */}
                        <div className="absolute inset-y-6 left-12 right-1/3 border-2 border-rose-500 bg-rose-500/10 rounded-lg shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse flex flex-col justify-between p-2 pointer-events-none">
                          <div className="flex items-center justify-between">
                            <span className="bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">AI Dolly Target</span>
                            <span className="text-rose-400 font-mono text-[8px]">1.4x PUSH</span>
                          </div>
                          {/* Motion vector direction arrow indicator */}
                          <div className="self-end border border-rose-400/40 bg-rose-500/20 backdrop-blur-sm px-2 py-0.5 rounded flex items-center gap-1">
                            <span className="text-[8px] text-rose-200">Tracking Path</span>
                            <span className="text-rose-400 text-xs">→</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Teams - Collaborative workspace board
                    <div className="absolute inset-0 w-full h-full p-4 flex flex-col justify-between bg-[#050505] overflow-hidden">
                      {/* Looping video canvas */}
                      <div className="absolute inset-0 opacity-60">
                        <video src="/205193-926528071_small.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover" />
                      </div>

                      {/* Top Action Bar */}
                      <div className="relative z-10 flex items-center justify-between w-full bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-white/90 tracking-wide">Multiplayer Timeline Review</span>
                        </div>
                        {/* Opt-in Cloud Badge */}
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-medium">
                          Cloud Secure
                        </span>
                      </div>

                      {/* Collaborative Elements: Timeline pin comment and multi-user pointer */}
                      <div className="relative z-10 flex items-end justify-between w-full mt-auto pt-4">
                        {/* Contextual pinned note */}
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-lg max-w-[200px] shadow-2xl">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-3 h-3 rounded-full bg-[#3275F8] flex items-center justify-center text-[7px] font-bold text-white">S</span>
                            <span className="text-[9px] font-bold text-white/80">Sarah (Director)</span>
                          </div>
                          <p className="text-[9px] text-white/70 leading-tight">"Beautiful environment structure. Let's export this frame setup."</p>
                        </div>

                        {/* Overlapping active contributor circles */}
                        <div className="flex items-center -space-x-1.5">
                          <div className="w-6 h-6 rounded-full bg-purple-500 border border-white flex items-center justify-center text-[9px] font-bold text-white shadow-md">A</div>
                          <div className="w-6 h-6 rounded-full bg-[#3275F8] border border-white flex items-center justify-center text-[9px] font-bold text-white shadow-md">S</div>
                          <div className="w-6 h-6 rounded-full bg-amber-500 border border-white flex items-center justify-center text-[9px] font-bold text-white shadow-md">M</div>
                        </div>
                      </div>
                    </div>
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
                <Link
                  to={ctaHref}
                  className="bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-white/90 px-5 py-2 rounded-full text-[13px] font-medium backdrop-blur-sm"
                >
                  {ctaLabel}
                </Link>
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
