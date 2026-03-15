import { cn } from "@/lib/utils";

interface ZenviLogoProps {
  className?: string;
  size?: number;
}

const VIEWBOX_SIZE = 32;
const SQUARE_SIZE = 14;
const STROKE_WIDTH = 1.5;

export function ZenviLogo({ className, size = 24 }: ZenviLogoProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Three square outlines: bottom-left → top-right stagger */}
      <rect
        x={2}
        y={8}
        width={SQUARE_SIZE}
        height={SQUARE_SIZE}
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
      />
      <rect
        x={8}
        y={4}
        width={SQUARE_SIZE}
        height={SQUARE_SIZE}
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
      />
      <rect
        x={14}
        y={0}
        width={SQUARE_SIZE}
        height={SQUARE_SIZE}
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
      />
    </svg>
  );
}
