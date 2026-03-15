import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  speed: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: string;
}

interface StarFieldProps {
  /** Number of stars to render. Default 180. */
  count?: number;
  /** Parallax factor 0–1. 0 = static, 1 = full scroll speed. Default 0.08 */
  parallaxFactor?: number;
  className?: string;
}

const STAR_COLORS = [
  "255,255,255",   // pure white
  "200,210,255",   // blue-white (hot star)
  "255,240,200",   // warm white (cooler star)
  "180,200,255",   // blue tint (plasma)
];

function createStar(canvasWidth: number, canvasHeight: number): Star {
  const colorIndex = Math.floor(Math.random() * STAR_COLORS.length);
  return {
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    radius: Math.random() * 1.2 + 0.2, // 0.2 – 1.4px
    opacity: Math.random() * 0.6 + 0.2, // 0.2 – 0.8
    speed: Math.random() * 0.08 + 0.02, // parallax drift speed
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: Math.random() * 0.008 + 0.002,
    color: STAR_COLORS[colorIndex],
  };
}

export function StarField({
  count = 180,
  parallaxFactor = 0.08,
  className = "",
}: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number>(0);
  const scrollYRef = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      // Rebuild star positions on resize
      starsRef.current = Array.from({ length: count }, () =>
        createStar(canvas.width, canvas.height)
      );
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Scroll listener for parallax
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    if (reducedMotion) {
      // Render static star field once and exit
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      starsRef.current.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color},${star.opacity * 0.7})`;
        ctx.fill();
      });
      return () => {
        ro.disconnect();
        window.removeEventListener("scroll", onScroll);
      };
    }

    let time = 0;

    const draw = () => {
      time += 1;
      const parallaxOffset = scrollYRef.current * parallaxFactor;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      starsRef.current.forEach((star) => {
        // Twinkle: oscillate opacity
        const twinkle =
          Math.sin(star.twinklePhase + time * star.twinkleSpeed) * 0.3;
        const finalOpacity = Math.max(0.05, Math.min(1, star.opacity + twinkle));

        // Parallax: stars at different depths scroll at different rates
        const parallaxY = (parallaxOffset * star.speed * 8) % canvas.height;
        const yPos = (star.y + parallaxY) % canvas.height;

        ctx.beginPath();
        ctx.arc(star.x, yPos, star.radius, 0, Math.PI * 2);

        // Glow for larger stars
        if (star.radius > 0.9) {
          const gradient = ctx.createRadialGradient(
            star.x, yPos, 0,
            star.x, yPos, star.radius * 3
          );
          gradient.addColorStop(0, `rgba(${star.color},${finalOpacity})`);
          gradient.addColorStop(1, `rgba(${star.color},0)`);
          ctx.fillStyle = gradient;
          ctx.arc(star.x, yPos, star.radius * 3, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = `rgba(${star.color},${finalOpacity})`;
        }

        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [count, parallaxFactor, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
