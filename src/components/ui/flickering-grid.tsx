import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface FlickeringGridProps {
  className?: string;
  squareSize?: number;
  gridGap?: number;
  color?: string;
  maxOpacity?: number;
  flickerChance?: number;
  fps?: number;
}

export function FlickeringGrid({
  className,
  squareSize = 4,
  gridGap = 22,
  color = "255, 255, 255",
  maxOpacity = 0.06,
  flickerChance = 0.05,
  fps = 12,
}: FlickeringGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (timestamp: number) => {
      const interval = 1000 / fps;
      if (timestamp - last < interval) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = timestamp;

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      for (let y = 0; y < height; y += gridGap) {
        for (let x = 0; x < width; x += gridGap) {
          const flicker = Math.random() < flickerChance;
          const alpha = flicker ? maxOpacity : maxOpacity * 0.22;
          ctx.fillStyle = `rgba(${color}, ${alpha})`;
          ctx.fillRect(x, y, squareSize, squareSize);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color, flickerChance, fps, gridGap, maxOpacity, squareSize]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden="true"
    />
  );
}
