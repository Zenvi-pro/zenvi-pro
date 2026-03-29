import { useState, useEffect, useRef } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextReveal } from "@/components/ui/text-reveal";

interface HeroProps {
  onOpenAccessCode: () => void;
}

const Hero = ({ onOpenAccessCode }: HeroProps) => {
  const [osLabel, setOsLabel] = useState("Mac");
  const [textRevealProgress, setTextRevealProgress] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Black overlay (with letter holes) zooms in as user scrolls
  const overlayScale = useTransform(scrollYProgress, [0, 0.65], [1, 9]);
  // Overlay fades out mid-zoom so the full video "breaks through"
  const overlayOpacity = useTransform(scrollYProgress, [0.28, 0.63], [1, 0]);

  const contentOpacity = useTransform(scrollYProgress, [0, 0.18, 0.32], [1, 1, 0]);
  const vignetteOpacity = useTransform(scrollYProgress, [0, 0.45, 0.72], [0.5, 0.3, 0]);
  const revealTextOpacity = useTransform(scrollYProgress, [0, 0.88, 0.93, 1], [0, 0, 1, 1]);
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.82, 0.9], [1, 1, 0]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const start = 0.9;
    const end = 1;
    const progress = (value - start) / (end - start);
    setTextRevealProgress(Math.max(0, Math.min(1, progress)));
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) setOsLabel("Windows");
    else if (/Linux/i.test(ua) && !/Android/i.test(ua)) setOsLabel("Linux");
    else setOsLabel("Mac");
  }, []);

  return (
    <section ref={sectionRef} className="relative h-screen bg-[#0A0A0A] sm:h-[340vh]">
      <div className="h-screen overflow-hidden sm:sticky sm:top-0">

        {/* Mobile: static video background */}
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-45 sm:hidden scale-[1.4]"
          src="/hero-video.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-black/60 sm:hidden" />

        {/* Desktop: full video always playing behind — visible through letter holes */}
        {/* scale-[1.4] crops the baked-in cinematic letterbox bars off-screen */}
        <video
          className="absolute inset-0 hidden h-full w-full object-cover sm:block scale-[1.4]"
          src="/hero-video.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />

        {/* Subtle vignette — fades out as overlay disappears */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-transparent to-black/60"
          style={{ opacity: vignetteOpacity }}
        />

        {/*
          Black overlay with ZENVI letter-shaped holes.
          The video behind shows through the holes — exactly like the NYC reference image.
          As user scrolls, overlay scales up (holes grow enormous) then fades away,
          revealing the full-screen video.
        */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-[2] hidden sm:block"
          style={{ scale: overlayScale, opacity: overlayOpacity, transformOrigin: "58% 50%" }}
        >
          <svg
            viewBox="0 0 1400 700"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <mask id="zenvi-letter-mask">
                {/* White = show the black rect (opaque background) */}
                <rect width="1400" height="700" fill="white" />
                {/* Black = punch holes in the shape of each letter (video shows through) */}
                <text
                  x="700"
                  y="360"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="242"
                  fontWeight="900"
                  style={{ fontFamily: "Inter, system-ui, sans-serif", letterSpacing: "12px" }}
                  fill="black"
                >
                  ZENVI
                </text>
              </mask>
            </defs>
            {/* Solid black overlay with letter holes cut out */}
            <rect width="1400" height="700" fill="#0A0A0A" mask="url(#zenvi-letter-mask)" />
          </svg>
        </motion.div>

        {/* Desktop CTA — fades out before zoom takes over */}
        <motion.div
          className="relative z-10 mx-auto hidden h-full max-w-5xl flex-col items-center justify-center px-6 text-center sm:flex"
          style={{ opacity: contentOpacity }}
        >
          <div className="absolute left-1/2 top-[64%] w-full max-w-4xl -translate-x-1/2 px-6 sm:top-[66%] md:top-[68%]">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mx-auto mb-6 max-w-3xl text-balance text-base text-white/85 sm:text-lg md:text-2xl"
            >
              Premier-grade AI editing. Local processing. Zero latency.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.55 }}
              className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
            >
              <Button
                onClick={onOpenAccessCode}
                size="lg"
                className="h-12 rounded-full bg-white px-8 text-base font-semibold text-black hover:bg-white/90"
              >
                Download for {osLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <a
                href="https://www.youtube.com/watch?v=5Nc7iPDJ4tw"
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-white/25 bg-black/25 px-8 text-base text-white hover:bg-white/10"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </a>
            </motion.div>
          </div>
        </motion.div>

        {/* Mobile CTA */}
        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-center sm:hidden">
          <div className="w-full max-w-md">
            <p className="mx-auto mb-6 text-balance text-[1.75rem] font-semibold text-white">
              Premier-grade AI editing. Local processing. Zero latency.
            </p>
            <div className="flex flex-col items-center justify-center gap-3">
              <Button
                onClick={onOpenAccessCode}
                size="lg"
                className="h-12 w-full rounded-full bg-white px-8 text-base font-semibold text-black hover:bg-white/90"
              >
                Download for {osLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <a
                href="https://www.youtube.com/watch?v=5Nc7iPDJ4tw"
                target="_blank"
                rel="noreferrer"
                className="w-full"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-full border-white/25 bg-black/25 px-8 text-base text-white hover:bg-white/10"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Text reveal at the very bottom of the scroll */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-[12] hidden items-center justify-center px-6 sm:flex"
          style={{ opacity: revealTextOpacity }}
        >
          <div className="max-w-5xl text-center">
            <TextReveal
              text={"Edit video at machine speed,\nnot cloud speed."}
              progress={textRevealProgress}
              strikePhrase="not cloud speed"
              strikeAtProgress={0.995}
              className="whitespace-pre-line text-4xl font-black leading-[0.95] tracking-[-0.02em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] md:text-7xl lg:text-[5.25rem]"
            />
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="pointer-events-none absolute bottom-7 left-1/2 z-20 -translate-x-1/2"
          style={{ opacity: scrollHintOpacity }}
        >
          <motion.div
            animate={{ y: [0, 5, 0], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="hidden rounded-full border border-white/20 bg-black/35 px-4 py-2 backdrop-blur-md sm:block"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/85">
              <span>Scroll</span>
              <span className="h-4 w-px bg-white/25" />
              <span>Down</span>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;
