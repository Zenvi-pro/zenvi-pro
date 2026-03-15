import { useReducedMotion, motion } from "framer-motion";

interface NebulaBackgroundProps {
  /** Show animated aurora gradient. Default true */
  aurora?: boolean;
  /** Show cosmic grid lines. Default true */
  grid?: boolean;
  /** Show floating orbs. Default true */
  orbs?: boolean;
  /** Overall opacity multiplier 0–1. Default 1 */
  intensity?: number;
  className?: string;
}

/**
 * NebulaBackground
 *
 * Layered space background for hero sections and feature blocks.
 * Renders: nebula gradient overlay + aurora animation + cosmic grid + floating orbs.
 * All layers respect prefers-reduced-motion — ambient animations are disabled,
 * static versions are shown instead.
 */
export function NebulaBackground({
  aurora = true,
  grid = true,
  orbs = true,
  intensity = 1,
  className = "",
}: NebulaBackgroundProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
      style={{ opacity: intensity }}
    >
      {/* ── Layer 1: Static nebula radial gradients ── */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 80% 50% at 20% 40%, rgba(110,24,212,0.10) 0%, transparent 60%)",
            "radial-gradient(ellipse 60% 40% at 80% 20%, rgba(0,102,255,0.08) 0%, transparent 60%)",
            "radial-gradient(ellipse 50% 60% at 50% 95%, rgba(0,179,128,0.05) 0%, transparent 60%)",
            "radial-gradient(ellipse 40% 30% at 90% 60%, rgba(168,85,247,0.06) 0%, transparent 50%)",
          ].join(", "),
        }}
      />

      {/* ── Layer 2: Hero radial (top vignette glow) ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(0,102,255,0.07) 0%, transparent 65%)",
        }}
      />

      {/* ── Layer 3: Aurora animated gradient ── */}
      {aurora && (
        <div
          className={`absolute inset-0 ${reducedMotion ? "" : "animate-aurora-shift"}`}
          style={{
            background:
              "linear-gradient(135deg, rgba(0,102,255,0.06) 0%, rgba(110,24,212,0.10) 30%, rgba(0,179,128,0.04) 65%, rgba(0,102,255,0.03) 100%)",
            backgroundSize: "400% 400%",
          }}
        />
      )}

      {/* ── Layer 4: Cosmic grid ── */}
      {grid && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "64px 64px",
            WebkitMaskImage:
              "radial-gradient(ellipse 85% 65% at 50% 50%, black 35%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse 85% 65% at 50% 50%, black 35%, transparent 100%)",
          }}
        />
      )}

      {/* ── Layer 5: Floating orbs ── */}
      {orbs && !reducedMotion && (
        <>
          {/* Plasma orb — top left */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "600px",
              height: "600px",
              top: "-200px",
              left: "-150px",
              background:
                "radial-gradient(circle, rgba(0,102,255,0.08) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
            animate={{ y: [0, -24, 0], x: [0, 12, 0] }}
            transition={{
              duration: 14,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
            }}
          />

          {/* Nebula orb — top right */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "500px",
              height: "500px",
              top: "-100px",
              right: "-100px",
              background:
                "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
            animate={{ y: [0, 18, 0], x: [0, -10, 0] }}
            transition={{
              duration: 18,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
              delay: 2,
            }}
          />

          {/* Aurora orb — bottom center */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "400px",
              height: "400px",
              bottom: "-100px",
              left: "50%",
              transform: "translateX(-50%)",
              background:
                "radial-gradient(circle, rgba(0,179,128,0.05) 0%, transparent 70%)",
              filter: "blur(70px)",
            }}
            animate={{ y: [0, -16, 0] }}
            transition={{
              duration: 12,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
              delay: 4,
            }}
          />
        </>
      )}

      {/* Static orbs for reduced motion */}
      {orbs && reducedMotion && (
        <>
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "600px",
              height: "600px",
              top: "-200px",
              left: "-150px",
              background: "radial-gradient(circle, rgba(0,102,255,0.06) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "500px",
              height: "500px",
              top: "-100px",
              right: "-100px",
              background: "radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </>
      )}
    </div>
  );
}
