import { cn } from "@/lib/utils";

interface ZenviLogoProps {
  className?: string;
  size?: number;
}

// Three equal squares stepped diagonally top-left → bottom-right.
// Each square is 18×18 in a 32×32 viewbox, with a step of 6 in both axes.
// The stroke (width 2) lands exactly on the viewbox edges:
//   top-left of rect 1:  (1,1)  → stroke outer edge at (0,0)
//   bottom-right of rect 3: (31,31) → stroke outer edge at (32,32)
const VIEWBOX = 32;
const SQ = 18;   // square side length
const STEP = 6;  // diagonal step between squares (equal x & y)
const SW = 2;    // stroke width

export function ZenviLogo({ className, size = 24 }: ZenviLogoProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1 + i * STEP}
          y={1 + i * STEP}
          width={SQ}
          height={SQ}
          stroke="currentColor"
          strokeWidth={SW}
        />
      ))}
    </svg>
  );
}
