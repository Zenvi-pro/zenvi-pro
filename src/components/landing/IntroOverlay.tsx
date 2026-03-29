import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ZenviLogo } from "@/components/ZenviLogo";

const LOGO_SIZE_INTRO = 120;
const FORM_DURATION = 0.7;
const HOLD_DURATION = 0.25;
const MOVE_DURATION = 0.8;
const OVERLAY_FADE_DURATION = 0.35;

interface IntroOverlayProps {
  onComplete: () => void;
}

export function IntroOverlay({ onComplete }: IntroOverlayProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [target, setTarget] = useState<{ left: number; top: number; scale: number }>({
    left: 24,
    top: 24,
    scale: 0.35,
  });

  const syncTargetFromNavbar = useCallback(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-zenvi-logo-target]"),
    );
    const el = targets.find((node) => {
      const r = node.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const targetSize = Math.max(rect.height, 42);
    setTarget({
      left: rect.left + rect.width / 2 - LOGO_SIZE_INTRO / 2,
      top: rect.top + rect.height / 2 - LOGO_SIZE_INTRO / 2,
      scale: targetSize / LOGO_SIZE_INTRO,
    });
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      onComplete();
      return;
    }
  }, [reducedMotion, onComplete]);

  useEffect(() => {
    if (reducedMotion) return;
    const t1 = setTimeout(() => setPhase(2), FORM_DURATION * 1000);
    return () => clearTimeout(t1);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || phase !== 2) return;
    const t2 = setTimeout(() => {
      syncTargetFromNavbar();
      requestAnimationFrame(() => setPhase(3));
    }, HOLD_DURATION * 1000);
    return () => clearTimeout(t2);
  }, [phase, reducedMotion, syncTargetFromNavbar]);

  useEffect(() => {
    if (reducedMotion) return;
    const raf = requestAnimationFrame(syncTargetFromNavbar);
    window.addEventListener("resize", syncTargetFromNavbar);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncTargetFromNavbar);
    };
  }, [reducedMotion, syncTargetFromNavbar]);

  const handlePhase3Complete = () => {
    setOverlayVisible(false);
    setTimeout(() => onComplete(), OVERLAY_FADE_DURATION * 1000);
  };

  if (reducedMotion) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: overlayVisible ? 1 : 0 }}
      transition={{ duration: OVERLAY_FADE_DURATION }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0A]"
      style={{ pointerEvents: overlayVisible ? "auto" : "none" }}
    >
      <motion.div
        className="absolute flex items-center justify-center text-white"
        style={{ width: LOGO_SIZE_INTRO, height: LOGO_SIZE_INTRO }}
        initial={{ left: "50%", top: "50%", x: "-50%", y: "-50%", scale: 1 }}
        animate={
          phase === 1
            ? { left: "50%", top: "50%", x: "-50%", y: "-50%", scale: 1, rotate: 0 }
            : phase === 2
              ? { left: "50%", top: "50%", x: "-50%", y: "-50%", scale: 1.02, rotate: 0 }
              : {
                  left: target.left,
                  top: target.top,
                  x: 0,
                  y: 0,
                  scale: target.scale,
                  rotate: 0,
                }
        }
        transition={
          phase === 1
            ? { duration: FORM_DURATION, ease: [0.22, 1, 0.36, 1] }
            : phase === 2
              ? { duration: HOLD_DURATION, ease: [0.4, 0, 0.2, 1] }
              : { duration: MOVE_DURATION, ease: [0.25, 0.1, 0.25, 1] }
        }
        onAnimationComplete={phase === 3 ? handlePhase3Complete : undefined}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.65 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: FORM_DURATION, ease: [0.22, 1, 0.36, 1] }}
          className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        >
          <ZenviLogo size={LOGO_SIZE_INTRO} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
