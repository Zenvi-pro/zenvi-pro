import { useEffect, useRef } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const draw = () => {
      animId = requestAnimationFrame(draw);

      if (video.readyState < 2) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw video scaled to cover the canvas (object-fit: cover behaviour)
      const vr = video.videoWidth / video.videoHeight;
      const cr = w / h;
      let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
      if (vr > cr) {
        sw = video.videoHeight * cr;
        sx = (video.videoWidth - sw) / 2;
      } else {
        sh = video.videoWidth / cr;
        sy = (video.videoHeight - sh) / 2;
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);

      // Punch the video through the text shape using destination-in compositing.
      // This is the approach that works in all browsers including Safari — the
      // previous CSS mask-image approach failed because browsers composite <video>
      // elements on their own GPU layer, bypassing parent CSS masks.
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "white";
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // letterSpacing supported in Chrome 99+ and Safari 17.2+
      if ("letterSpacing" in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${letterSpacing}px`;
      }
      ctx.fillText(children, w / 2, h / 2);
      ctx.globalCompositeOperation = "source-over";
    };

    const start = () => {
      animId = requestAnimationFrame(draw);
    };

    if (video.readyState >= 2) {
      start();
    } else {
      video.addEventListener("canplay", start, { once: true });
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [children, fontSize, fontWeight, fontFamily, letterSpacing]);

  return (
    <div className={cn("absolute inset-0", className)}>
      {/*
       * Keep the video as a tiny visible element (not display:none) so that
       * browsers don't suspend playback. 1×1 px, fully transparent, off-flow.
       */}
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        preload={preload}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Canvas receives the composited video-through-text output */}
      <canvas
        ref={canvasRef}
        width={viewBoxWidth}
        height={viewBoxHeight}
        className={cn("h-full w-full", videoClassName)}
      />

      {/* Colour tints sit on top; mix-blend-mode:screen only shows over
          opaque canvas pixels (i.e. the text letters), so the background
          outside the letters is unaffected. */}
      <div className={cn("pointer-events-none absolute inset-0", tintClassName)} />
      <div className={cn("pointer-events-none absolute inset-0", whiteTintClassName)} />
    </div>
  );
}
