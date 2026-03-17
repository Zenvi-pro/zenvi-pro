import { RefObject, useId, useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedBeamProps {
  containerRef: RefObject<HTMLElement>;
  fromRef: RefObject<HTMLElement>;
  toRef: RefObject<HTMLElement>;
  curvature?: number;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
  animate?: boolean;
  travelOnce?: boolean;
}

type PathGeometry = {
  d: string;
  width: number;
  height: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 4,
  delay = 0,
  pathColor = "rgba(255,255,255,0.08)",
  pathWidth = 2,
  pathOpacity = 1,
  gradientStartColor = "#3b82f6",
  gradientStopColor = "#22d3ee",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
  animate = true,
  travelOnce = false,
}: AnimatedBeamProps) {
  const gradientId = useId().replace(/:/g, "");
  const [geometry, setGeometry] = useState<PathGeometry | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const container = containerRef.current;
      const from = fromRef.current;
      const to = toRef.current;
      if (!container || !from || !to) return;

      const cr = container.getBoundingClientRect();
      const fr = from.getBoundingClientRect();
      const tr = to.getBoundingClientRect();
      if (cr.width === 0 || cr.height === 0 || fr.width === 0 || tr.width === 0) return;

      const startX = fr.left - cr.left + fr.width / 2 + startXOffset;
      const startY = fr.top - cr.top + fr.height / 2 + startYOffset;
      const endX = tr.left - cr.left + tr.width / 2 + endXOffset;
      const endY = tr.top - cr.top + tr.height / 2 + endYOffset;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2 - curvature;

      setGeometry({
        d: `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`,
        width: cr.width,
        height: cr.height,
        startX,
        startY,
        endX,
        endY,
      });
    };

    update();
    const raf1 = requestAnimationFrame(update);
    const raf2 = requestAnimationFrame(update);
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    if (fromRef.current) ro.observe(fromRef.current);
    if (toRef.current) ro.observe(toRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
  ]);

  if (!geometry) return null;

  // Gradient runs from start to end of the path so the dot colour is correct
  // regardless of beam angle.
  const gx1 = reverse ? geometry.endX : geometry.startX;
  const gy1 = reverse ? geometry.endY : geometry.startY;
  const gx2 = reverse ? geometry.startX : geometry.endX;
  const gy2 = reverse ? geometry.startY : geometry.endY;

  // Stroke-dasharray: dot-length + gap. Total path ~ width of container, so
  // using a generous offset keeps the dot travelling continuously.
  const totalLength = geometry.width + geometry.height;
  const dotLength = 30;
  const gap = totalLength;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={gx1}
          y1={gy1}
          x2={gx2}
          y2={gy2}
        >
          <stop offset="0%" stopColor={gradientStartColor} stopOpacity="0" />
          <stop offset="40%" stopColor={gradientStartColor} />
          <stop offset="100%" stopColor={gradientStopColor} />
        </linearGradient>
      </defs>

      {/* Static path underneath */}
      <path
        d={geometry.d}
        stroke={pathColor}
        strokeOpacity={pathOpacity}
        strokeWidth={pathWidth}
        strokeLinecap="round"
        fill="none"
      />

      {/* Animated travelling dot */}
      {animate && (
        <motion.path
          d={geometry.d}
          stroke={`url(#${gradientId})`}
          strokeWidth={pathWidth + 1.5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dotLength} ${gap}`}
          initial={{ strokeDashoffset: reverse ? -(dotLength + gap) : 0 }}
          animate={{ strokeDashoffset: reverse ? 0 : -(dotLength + gap) }}
          transition={{
            duration,
            repeat: travelOnce ? 0 : Infinity,
            ease: "linear",
            delay,
          }}
        />
      )}
    </svg>
  );
}
