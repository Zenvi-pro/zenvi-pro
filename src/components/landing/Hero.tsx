import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextReveal } from "@/components/ui/text-reveal";

interface HeroProps {
  onOpenWaitlist: () => void;
  /** Called once the mask reveal sequence has finished. */
  onRevealSequenceComplete?: () => void;
}

const SUB_TEXT = "Edit video at machine speed, not cloud speed.";

const scrollToDemo = () => {
  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
};

/**
 * Hero scroll choreography (desktop):
 *
 *   progress    | what happens
 *   ----------- | -----------------------------------------------------------
 *   0.00–0.50   | ZENVI letter-mask zooms (scale 1 → 9), revealing video
 *   0.30–0.52   | Mask overlay fades opacity 1 → 0, video fills the frame
 *   0.55–0.82   | Headline + sub + CTAs fade IN on top of the full video
 *   0.55–1.00   | Soft cyan glow halo behind the text (Lumina-inspired)
 *   0.92–1.00   | Scroll hint fades out as the user lands at section end
 *
 * Section height is 220vh — short enough that almost every scroll px drives
 * a visual change (no dead-scroll past the animation), long enough that
 * mouse-wheel ticks feel continuous when smoothed by useSpring.
 */
const Hero = ({ onOpenWaitlist, onRevealSequenceComplete }: HeroProps) => {
  const sectionRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Inertial smoothing so wheel ticks lerp into the animation instead of
  // snapping. Mass/damping tuned for a glassy slide, not a bouncy one.
  const progress = useSpring(scrollYProgress, {
    damping: 55,
    stiffness: 220,
    mass: 0.45,
  });

  // --- Transform pipeline (all derived from the smoothed progress) ---
  const overlayScale = useTransform(progress, [0, 0.50], [1, 9]);
  const overlayOpacityMV = useTransform(progress, [0.30, 0.52], [1, 0]);
  const vignetteOpacityMV = useTransform(progress, [0, 0.35, 0.55], [0.5, 0.3, 0]);
  const heroTextOpacityMV = useTransform(progress, [0.55, 0.82], [0, 1]);
  const heroTextYMV = useTransform(progress, [0.55, 0.82], [38, 0]);
  const glowOpacityMV = useTransform(progress, [0.50, 0.82], [0, 1]);
  const scrollHintOpacityMV = useTransform(progress, [0, 0.85, 0.97], [1, 1, 0]);

  // --- State-driven mirrors of those motion values ---
  // We bind these to inline `style.opacity` via React state because applying
  // multiple MotionValues to a single `style={{ ... }}` in framer-motion v12
  // proved unreliable for the opacity slot (scale wrote to the DOM, opacity
  // did not). State binding is deterministic.
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [vignetteOpacity, setVignetteOpacity] = useState(0.5);
  const [heroTextOpacity, setHeroTextOpacity] = useState(0);
  const [heroTextY, setHeroTextY] = useState(38);
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [scrollHintOpacity, setScrollHintOpacity] = useState(1);

  useMotionValueEvent(overlayOpacityMV, "change", (v) => setOverlayOpacity(v));
  useMotionValueEvent(vignetteOpacityMV, "change", (v) => setVignetteOpacity(v));
  useMotionValueEvent(heroTextOpacityMV, "change", (v) => setHeroTextOpacity(v));
  useMotionValueEvent(heroTextYMV, "change", (v) => setHeroTextY(v));
  useMotionValueEvent(glowOpacityMV, "change", (v) => setGlowOpacity(v));
  useMotionValueEvent(scrollHintOpacityMV, "change", (v) => setScrollHintOpacity(v));

  // Fire the reveal-complete callback once the overlay has fully faded.
  useEffect(() => {
    if (!onRevealSequenceComplete) return;
    if (overlayOpacity <= 0.02) onRevealSequenceComplete();
  }, [overlayOpacity, onRevealSequenceComplete]);

  // Animate the sub-line strike-through reveal on mount.
  const [subProgress, setSubProgress] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 1900;
    const delay = 450;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start - delay;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / duration);
      setSubProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const id = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-screen bg-[#0A0A0A] sm:h-[220vh]">
      {/* Visually-hidden H1 — keeps the SVG wordmark as the visual headline */}
      <h1 className="sr-only">
        Edit like you're meant to. Zenvi is AI video editing that runs on your machine.
      </h1>

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

        {/* Desktop: full video always playing behind */}
        <video
          className="absolute inset-0 hidden h-full w-full object-cover sm:block scale-[1.4]"
          src="/hero-video.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />

        {/* Vignette — fades out as overlay disappears */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/55 via-transparent to-black/65"
          style={{ opacity: vignetteOpacity }}
        />

        {/*
          Black overlay with ZENVI letter-shaped holes (desktop only).
          Scale drives the zoom via framer-motion (works fine); opacity drives
          the fade via React state (workaround for the v12 MotionValue gotcha).
        */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-[2] hidden sm:block"
          style={{
            scale: overlayScale,
            opacity: overlayOpacity,
            transformOrigin: "58% 50%",
            willChange: "transform, opacity",
          }}
        >
          <svg
            viewBox="0 0 1400 700"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <mask id="zenvi-letter-mask">
                <rect width="1400" height="700" fill="white" />
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
            <rect width="1400" height="700" fill="#0A0A0A" mask="url(#zenvi-letter-mask)" />
          </svg>
        </motion.div>

        {/*
          Subtle radial glow (Lumina-inspired). Sits behind the headline.
          Cool cyan tint to echo the underwater whale palette without overpowering.
        */}
        <div
          className="pointer-events-none absolute inset-0 z-[3] hidden sm:block"
          style={{
            opacity: glowOpacity,
            background:
              "radial-gradient(ellipse 60% 40% at 50% 56%, rgba(120,210,255,0.22) 0%, rgba(120,210,255,0.10) 30%, transparent 70%)",
            mixBlendMode: "screen",
          }}
        />

        {/* Desktop: headline + sub + CTAs — appear AFTER the mask fades */}
        <div
          className="pointer-events-none absolute inset-0 z-10 mx-auto hidden h-full max-w-5xl items-center justify-center px-6 text-center sm:flex"
          style={{ opacity: heroTextOpacity }}
        >
          <div
            className="pointer-events-auto w-full max-w-4xl px-6"
            style={{ transform: `translateY(${heroTextY}px)` }}
          >
            <p
              aria-hidden="true"
              className="mx-auto mb-3 max-w-3xl text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.6)] md:text-5xl"
            >
              Edit like you're meant to.
            </p>

            <div className="mx-auto mb-8 max-w-3xl">
              <TextReveal
                text={SUB_TEXT}
                progress={subProgress}
                strikePhrase="not cloud speed"
                strikeAtProgress={0.92}
                className="mx-auto text-base text-white/90 drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] sm:text-lg md:text-2xl"
              />
            </div>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                onClick={onOpenWaitlist}
                size="lg"
                className="h-12 rounded-full bg-white px-8 text-base font-semibold text-black shadow-[0_8px_40px_rgba(120,210,255,0.18)] hover:bg-white/90"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={scrollToDemo}
                variant="outline"
                size="lg"
                className="h-12 rounded-full border-white/30 bg-black/30 px-8 text-base text-white backdrop-blur-md hover:bg-white/10"
              >
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile: headline + sub + CTAs — visible immediately (no scroll choreography) */}
        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-center sm:hidden">
          <div className="w-full max-w-md">
            <p
              aria-hidden="true"
              className="mb-3 text-balance text-[1.875rem] font-semibold leading-[1.05] tracking-[-0.02em] text-white"
            >
              Edit like you're meant to.
            </p>
            <div className="mx-auto mb-6 max-w-md">
              <TextReveal
                text={SUB_TEXT}
                progress={subProgress}
                strikePhrase="not cloud speed"
                strikeAtProgress={0.92}
                className="text-base text-white/85"
              />
            </div>
            <div className="flex flex-col items-center justify-center gap-3">
              <Button
                onClick={onOpenWaitlist}
                size="lg"
                className="h-12 w-full rounded-full bg-white px-8 text-base font-semibold text-black hover:bg-white/90"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={scrollToDemo}
                variant="outline"
                size="lg"
                className="h-12 w-full rounded-full border-white/25 bg-black/25 px-8 text-base text-white hover:bg-white/10"
              >
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll hint — sits at the bottom, fades out as the user reaches section end */}
        <div
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
        </div>

      </div>
    </section>
  );
};

export default Hero;
