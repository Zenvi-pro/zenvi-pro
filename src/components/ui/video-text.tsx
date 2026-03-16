import { useId } from "react";
import { cn } from "@/lib/utils";

interface VideoTextProps {
  src: string;
  children: string;
  className?: string;
  videoClassName?: string;
  tintClassName?: string;
  whiteTintClassName?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: "auto" | "metadata" | "none";
  fontSize?: number;
  fontWeight?: number | string;
  fontFamily?: string;
  letterSpacing?: number;
  viewBoxWidth?: number;
  viewBoxHeight?: number;
}

export function VideoText({
  src,
  children,
  className,
  videoClassName,
  tintClassName = "bg-sky-400/12 mix-blend-screen",
  whiteTintClassName = "bg-white/6 mix-blend-screen",
  autoPlay = true,
  muted = true,
  loop = true,
  preload = "metadata",
  fontSize = 200,
  fontWeight = 900,
  fontFamily = "Inter, system-ui, sans-serif",
  letterSpacing = 10,
  viewBoxWidth = 1400,
  viewBoxHeight = 700,
}: VideoTextProps) {
  const maskId = useId().replace(/:/g, "");

  return (
    <div className={cn("absolute inset-0", className)}>
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width={viewBoxWidth} height={viewBoxHeight} fill="black" />
            <text
              x={viewBoxWidth / 2}
              y={viewBoxHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={fontSize}
              fontWeight={fontWeight}
              fontFamily={fontFamily}
              letterSpacing={letterSpacing}
            >
              {children}
            </text>
          </mask>
        </defs>

        <foreignObject x="0" y="0" width={viewBoxWidth} height={viewBoxHeight} mask={`url(#${maskId})`}>
          <div className="relative h-full w-full">
            <video
              className={cn("h-full w-full object-cover", videoClassName)}
              src={src}
              autoPlay={autoPlay}
              muted={muted}
              loop={loop}
              playsInline
              preload={preload}
            />
            <div className={cn("pointer-events-none absolute inset-0", tintClassName)} />
            <div className={cn("pointer-events-none absolute inset-0", whiteTintClassName)} />
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
