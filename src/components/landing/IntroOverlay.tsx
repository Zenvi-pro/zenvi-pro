import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const VIEWBOX_SIZE = 32;
const SQUARE_SIZE = 14;
const STROKE_WIDTH = 1.5;
const LOGO_SIZE_INTRO = 120;

const NAVBAR_LOGO_SCALE = 0.2;
const LOGO_SIZE_SCALED = LOGO_SIZE_INTRO * NAVBAR_LOGO_SCALE;
const NAVBAR_LOGO_LEFT = 24 - LOGO_SIZE_SCALED / 2;
const NAVBAR_LOGO_TOP = 32 - LOGO_SIZE_SCALED / 2;

const STAGGER_DELAY = 0.12;
const PHASE1_DURATION = 0.55;
const PHASE2_HOLD = 0.6;
const PHASE3_DURATION = 0.85;
const OVERLAY_FADE_DURATION = 0.4;

interface IntroOverlayProps {
  onComplete: () => void;
}

export function IntroOverlay({ onComplete }: IntroOverlayProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<1 | 2 | 3 | "done">(1);
  const [overlayVisible, setOverlayVisible] = useState(true);

  useEffect(() => {
    if (reducedMotion) {
      onComplete();
      return;
    }
  }, [reducedMotion, onComplete]);

  useEffect(() => {
    if (reducedMotion) return;
    const t1 = setTimeout(() => setPhase(2), (PHASE1_DURATION + STAGGER_DELAY * 2) * 1000);
    return () => clearTimeout(t1);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || phase !== 2) return;
    const t2 = setTimeout(() => setPhase(3), PHASE2_HOLD * 1000);
    return () => clearTimeout(t2);
  }, [phase, reducedMotion]);

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
        style={{
          width: LOGO_SIZE_INTRO,
          height: LOGO_SIZE_INTRO,
          left: "50%",
          top: "50%",
          x: "-50%",
          y: "-50%",
        }}
        initial={false}
        animate={
          phase === 1
            ? { left: "50%", top: "50%", x: "-50%", y: "-50%", scale: 1 }
            : phase === 2
              ? {
                  left: "50%",
                  top: "50%",
                  x: "-50%",
                  y: "-50%",
                  scale: [1, 1.02, 1],
                }
              : phase === 3
                ? {
                    left: NAVBAR_LOGO_LEFT,
                    top: NAVBAR_LOGO_TOP,
                    x: 0,
                    y: 0,
                    scale: NAVBAR_LOGO_SCALE,
                  }
                : {}
        }
        transition={
          phase === 2
            ? {
                scale: {
                  duration: PHASE2_HOLD,
                  ease: [0.4, 0, 0.2, 1],
                },
              }
            : phase === 3
              ? {
                  duration: PHASE3_DURATION,
                  ease: [0.25, 0.1, 0.25, 1],
                }
              : {}
        }
        onAnimationComplete={phase === 3 ? handlePhase3Complete : undefined}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          width={LOGO_SIZE_INTRO}
          height={LOGO_SIZE_INTRO}
          className="absolute inset-0 h-full w-full shrink-0 text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <motion.rect
            x={2}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 8, scale: 1 }}
            transition={{
              duration: PHASE1_DURATION,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0,
            }}
          />
          <motion.rect
            x={8}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            transition={{
              duration: PHASE1_DURATION,
              ease: [0.25, 0.1, 0.25, 1],
              delay: STAGGER_DELAY,
            }}
          />
          <motion.rect
            x={14}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: PHASE1_DURATION,
              ease: [0.25, 0.1, 0.25, 1],
              delay: STAGGER_DELAY * 2,
            }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}
