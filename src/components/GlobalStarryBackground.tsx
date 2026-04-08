import { NebulaBackground } from "@/components/landing/NebulaBackground";
import { StarField } from "@/components/landing/StarField";

/**
 * App-wide ambient background layer.
 * Fixed behind all routes so every page gets a consistent starfield treatment.
 */
export function GlobalStarryBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#050507]" />
      <NebulaBackground intensity={0.65} aurora grid orbs className="opacity-70" />
      <StarField count={120} parallaxFactor={0.04} className="opacity-85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_65%_at_50%_100%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.42)_100%)]" />
    </div>
  );
}
