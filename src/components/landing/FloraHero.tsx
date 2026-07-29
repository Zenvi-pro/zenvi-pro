/**
 * FloraHero — Zenvi's hero, treated with a flora-grade design system.
 *
 * What's preserved from Zenvi's working hero:
 *   - ZENVI letter-mask reveal of /hero-video.mp4
 *   - Smooth spring-driven scroll choreography
 *   - State-bound opacity (works around the v12 MotionValue→style.opacity gotcha)
 *
 * What's layered on (design-language patterns, not creative content):
 *   - Geist sans for all UI text
 *   - Instrument Serif for the editorial display headline
 *   - Off-black ground (#0A0A0A), white text, one restrained accent
 *   - Announcement chip at the top with 12px-radius pill
 *   - 12px-radius CTAs (not full pill)
 *   - Trust strip beneath the CTAs
 *   - 1240px content container, 24px outer padding
 *
 * All copy is Zenvi's own voice. Media slots use the existing /hero-video.mp4.
 */

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { TextReveal } from "@/components/ui/text-reveal";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface FloraHeroProps {
  onOpenWaitlist: () => void;
}

const SUB_TEXT = "Edit video at machine speed, not cloud speed.";

const DEMO_URL = "https://youtu.be/feE7LcIpIHs";

const openDemo = () => {
  window.open(DEMO_URL, "_blank", "noopener,noreferrer");
};

/**
 * Scroll choreography (desktop):
 *
 *   progress    | what happens
 *   ----------- | -----------------------------------------------------------
 *   0.00–0.50   | ZENVI letter-mask zooms (scale 1 → 9)
 *   0.30–0.52   | Mask opacity fades 1 → 0, video fills the frame
 *   0.00–0.30   | Announcement chip fades out
 *   0.55–0.82   | Headline + sub + CTAs + trust fade IN on the video
 *   0.50–0.82   | Soft cool-white glow halo behind the text
 *   0.85–0.97   | Scroll hint fades out
 */
const FloraHero = ({ onOpenWaitlist }: FloraHeroProps) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsLoggedIn(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setIsLoggedIn(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const ctaHref = isLoggedIn ? "/dashboard/download" : "/login?mode=signup";
  const ctaLabel = isLoggedIn ? "Download Now" : "Get Started Free";

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const progress = useSpring(scrollYProgress, {
    damping: 55,
    stiffness: 220,
    mass: 0.45,
  });

  const overlayScale = useTransform(progress, [0, 0.50], [1, 9]);
  const overlayOpacityMV = useTransform(progress, [0.30, 0.52], [1, 0]);
  const vignetteOpacityMV = useTransform(progress, [0, 0.35, 0.55], [0.55, 0.32, 0]);
  const announcementOpacityMV = useTransform(progress, [0, 0.18, 0.30], [1, 0.6, 0]);
  const heroTextOpacityMV = useTransform(progress, [0.55, 0.82], [0, 1]);
  const heroTextYMV = useTransform(progress, [0.55, 0.82], [42, 0]);
  const glowOpacityMV = useTransform(progress, [0.50, 0.82], [0, 1]);
  const scrollHintOpacityMV = useTransform(progress, [0, 0.85, 0.97], [1, 1, 0]);

  const desktopSubProgressMV = useTransform(progress, [0.65, 0.85], [0, 1]);
  const desktopStrikeProgressMV = useTransform(progress, [0.85, 0.95], [0, 1]);

  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [vignetteOpacity, setVignetteOpacity] = useState(0.55);
  const [announcementOpacity, setAnnouncementOpacity] = useState(1);
  const [heroTextOpacity, setHeroTextOpacity] = useState(0);
  const [heroTextY, setHeroTextY] = useState(42);
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [scrollHintOpacity, setScrollHintOpacity] = useState(1);
  
  const [desktopSubProgress, setDesktopSubProgress] = useState(0);
  const [desktopStrikeProgress, setDesktopStrikeProgress] = useState(0);

  useMotionValueEvent(overlayOpacityMV, "change", (v) => setOverlayOpacity(v));
  useMotionValueEvent(vignetteOpacityMV, "change", (v) => setVignetteOpacity(v));
  useMotionValueEvent(announcementOpacityMV, "change", (v) => setAnnouncementOpacity(v));
  useMotionValueEvent(heroTextOpacityMV, "change", (v) => setHeroTextOpacity(v));
  useMotionValueEvent(heroTextYMV, "change", (v) => setHeroTextY(v));
  useMotionValueEvent(glowOpacityMV, "change", (v) => setGlowOpacity(v));
  useMotionValueEvent(scrollHintOpacityMV, "change", (v) => setScrollHintOpacity(v));
  useMotionValueEvent(desktopSubProgressMV, "change", (v) => setDesktopSubProgress(v));
  useMotionValueEvent(desktopStrikeProgressMV, "change", (v) => setDesktopStrikeProgress(v));

  // Strike-through sub-line reveal on mount (for mobile)
  const [mobileSubProgress, setMobileSubProgress] = useState(0);
  const [mobileStrikeProgress, setMobileStrikeProgress] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const revealDuration = 1500;
    const strikeDelay = 1800;
    const strikeDuration = 1000;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start - 500;
      if (elapsed >= 0) {
        setMobileSubProgress(Math.min(1, elapsed / revealDuration));
      }
      const strikeElapsed = now - start - strikeDelay;
      if (strikeElapsed >= 0) {
        setMobileStrikeProgress(Math.min(1, strikeElapsed / strikeDuration));
      }
      if (strikeElapsed < strikeDuration) raf = requestAnimationFrame(tick);
    };
    const id = setTimeout(() => { raf = requestAnimationFrame(tick); }, 500);
    return () => { clearTimeout(id); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen bg-[#0A0A0A] font-sans sm:h-[220vh]"
    >
      {/* Visually-hidden semantic H1 */}
      <h1 className="sr-only">
        Edit like you're meant to. Zenvi is AI video editing that runs on your machine.
      </h1>

      <div className="h-screen overflow-hidden sm:sticky sm:top-0">

        {/* === BACKGROUND VIDEO LAYER ===
            TODO(placeholder): /hero-video.mp4 is Zenvi's existing whale clip.
            Replace with the final showreel master when ready. */}
        <video
          className="absolute inset-0 h-full w-full scale-[1.4] object-cover opacity-45 sm:hidden"
          src="/hero-video.mp4"
          autoPlay muted loop playsInline preload="metadata"
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-black/60 sm:hidden" />

        <video
          className="absolute inset-0 hidden h-full w-full scale-[1.4] object-cover sm:block"
          src="/hero-video.mp4"
          autoPlay muted loop playsInline preload="metadata"
        />

        {/* Vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/55 via-transparent to-black/65"
          style={{ opacity: vignetteOpacity }}
        />

        {/* === ZENVI letter-mask overlay (desktop) === */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-[2] hidden sm:flex items-center justify-center bg-black text-white"
          style={{
            scale: overlayScale,
            opacity: overlayOpacity,
            mixBlendMode: "multiply",
            transformOrigin: "50% 50%",
            willChange: "transform, opacity",
          }}
        >
          <div 
            className="font-bold text-center"
            style={{ 
              fontFamily: "Geist, system-ui, sans-serif", 
              fontSize: "min(18vw, 290px)", 
              letterSpacing: "0.05em",
              transform: "translateX(2%)" // slightly shift to center the optical weight
            }}
          >
            ZENVI
          </div>
        </motion.div>

        {/* Soft cool-white halo behind the post-reveal headline */}
        <div
          className="pointer-events-none absolute inset-0 z-[3] hidden sm:block"
          style={{
            opacity: glowOpacity,
            background:
              "radial-gradient(ellipse 55% 38% at 50% 52%, rgba(230,240,255,0.14) 0%, rgba(230,240,255,0.05) 35%, transparent 72%)",
            mixBlendMode: "screen",
          }}
        />

        {/* === ANNOUNCEMENT CHIP (top, fades with scroll) === */}
        <div
          className="pointer-events-none absolute inset-x-0 top-24 z-[15] flex items-center justify-center px-6 sm:top-28"
          style={{ opacity: announcementOpacity }}
        >
          <Link
            to={ctaHref}
            className="pointer-events-auto group inline-flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.06] py-1.5 pl-1.5 pr-3 text-sm backdrop-blur-md transition-colors hover:bg-white/[0.10] active:scale-[0.985]"
          >
            <span className="rounded-[8px] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-black">
              New
            </span>
            <span className="text-white/85">Zenvi for Mac is in early access</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-white/55 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* === DESKTOP post-reveal content === */}
        <div
          className="pointer-events-none absolute inset-0 z-10 mx-auto hidden h-full max-w-[1240px] items-center justify-center px-6 text-center sm:flex"
          style={{ opacity: heroTextOpacity }}
        >
          <div
            className="pointer-events-auto w-full px-6"
            style={{ transform: `translateY(${heroTextY}px)` }}
          >
            {/* Editorial display headline */}
            <h2
              aria-hidden="true"
              className="mx-auto mb-6 max-w-4xl text-balance font-serif text-5xl font-normal leading-[1.02] tracking-[-0.01em] text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.6)] md:text-[76px] md:leading-[1.04]"
            >
              Edit like you're <em className="italic">meant</em> to.
            </h2>

            {/* Sub-line with strike-through */}
            <div className="mx-auto mb-10 max-w-3xl">
              <TextReveal
                text={SUB_TEXT}
                progress={desktopSubProgress}
                strikePhrase="not cloud speed"
                strikeProgress={desktopStrikeProgress}
                className="mx-auto text-base font-medium text-white/85 drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] md:text-xl"
              />
            </div>

            {/* CTAs */}
            <div className="flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
              <Link
                to={ctaHref}
                className="inline-flex h-10 items-center gap-1.5 rounded-[12px] bg-white px-5 text-sm font-medium text-black transition-all hover:bg-white/90 active:scale-[0.98]"
              >
                {ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={openDemo}
                className="inline-flex h-10 items-center gap-1.5 rounded-[12px] border border-white/15 bg-white/[0.06] px-5 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/[0.12] active:scale-[0.98]"
              >
                <Play className="h-3.5 w-3.5" />
                Watch Demo
              </button>
            </div>

            {/* Trust strip */}
            <div className="mt-12 flex flex-col items-center gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
                Edited by creators at
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-white/55">
                {/* TODO(placeholder): swap with real customer SVG logos when available. */}
                <span>Superteam Canada</span>
                <span className="h-1 w-1 rounded-full bg-white/15" aria-hidden="true" />
                <span>Ajna Materials</span>
                <span className="h-1 w-1 rounded-full bg-white/15" aria-hidden="true" />
                <span>Passport</span>
              </div>
            </div>
          </div>
        </div>

        {/* === MOBILE: content visible immediately, no scroll choreography === */}
        <div className="relative z-10 mx-auto flex h-full max-w-[1240px] flex-col items-center justify-center px-6 text-center sm:hidden">
          <div className="w-full max-w-md">
            <Link
              to={ctaHref}
              className="mb-4 inline-flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.06] py-1.5 pl-1.5 pr-3 text-xs backdrop-blur-md active:scale-95 transition-all"
            >
              <span className="rounded-[8px] bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-black">New</span>
              <span className="text-white/85">Zenvi for Mac · Early access</span>
            </Link>
            <h2
              aria-hidden="true"
              className="mb-3 text-balance font-serif text-[2.25rem] font-normal leading-[1.05] tracking-[-0.01em] text-white"
            >
              Edit like you're <em className="italic">meant</em> to.
            </h2>
            <div className="mx-auto mb-7 max-w-md">
              <TextReveal
                text={SUB_TEXT}
                progress={mobileSubProgress}
                strikePhrase="not cloud speed"
                strikeProgress={mobileStrikeProgress}
                className="text-sm text-white/85"
              />
            </div>
            <div className="flex flex-col items-center justify-center gap-2.5">
              <Link
                to={ctaHref}
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] bg-white px-5 text-sm font-medium text-black transition-all hover:bg-white/90 active:scale-[0.98]"
              >
                {ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={openDemo}
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] border border-white/15 bg-white/[0.06] px-5 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/[0.12] active:scale-[0.98]"
              >
                <Play className="h-3.5 w-3.5" />
                Watch Demo
              </button>
            </div>
            <div className="mt-9 flex flex-col items-center gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">Edited by creators at</p>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/55">
                <span>Superteam Canada</span>
                <span>·</span>
                <span>Ajna Materials</span>
                <span>·</span>
                <span>Passport</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className="pointer-events-none absolute bottom-7 left-1/2 z-20 -translate-x-1/2"
          style={{ opacity: scrollHintOpacity }}
        >
          <motion.div
            animate={{ y: [0, 5, 0], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="hidden rounded-[12px] border border-white/15 bg-black/35 px-3.5 py-1.5 backdrop-blur-md sm:block"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/80">
              <span>Scroll</span>
              <span className="h-3 w-px bg-white/25" />
              <span>Down</span>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default FloraHero;
