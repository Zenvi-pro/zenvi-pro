import type { CSSProperties } from "react";
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
  // Build a data-URI SVG mask so the CSS mask-image approach can be used.
  // The previous approach (SVG <mask> + <foreignObject>) is silently broken in
  // Safari / WebKit — foreignObject content is not rendered when inside a mask.
  // CSS mask-image with a data-URI SVG is fully supported in Safari (with the
  // -webkit- prefix) and all other modern browsers.
  const svgMask =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}">` +
    `<rect width="${viewBoxWidth}" height="${viewBoxHeight}" fill="black"/>` +
    `<text` +
    ` x="${viewBoxWidth / 2}"` +
    ` y="${viewBoxHeight / 2}"` +
    ` text-anchor="middle"` +
    ` dominant-baseline="middle"` +
    ` fill="white"` +
    ` font-size="${fontSize}"` +
    ` font-weight="${fontWeight}"` +
    ` letter-spacing="${letterSpacing}"` +
    ` font-family="${fontFamily}"` +
    `>${children}</text>` +
    `</svg>`;

  const maskUrl = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMask)}")`;

  const maskStyle: CSSProperties = {
    WebkitMaskImage: maskUrl,
    maskImage: maskUrl,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };

  return (
    <div className={cn("absolute inset-0", className)}>
      <div className="relative h-full w-full" style={maskStyle}>
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
    </div>
  );
}
