import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { RotateCcw, Compass } from "lucide-react";

interface Interactive3DOrbitVideoProps {
  videoSrc: string;
  className?: string;
}

export function Interactive3DOrbitVideo({ videoSrc, className }: Interactive3DOrbitVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotationAngles, setRotationAngles] = useState({ x: 15, y: -25, z: 5 });

  // Smooth framer-motion springs for premium buttery-smooth 3D transforms
  const springConfig = { damping: 25, stiffness: 120 };
  const rotateX = useSpring(rotationAngles.x, springConfig);
  const rotateY = useSpring(rotationAngles.y, springConfig);
  const rotateZ = useSpring(rotationAngles.z, springConfig);

  // Sync state to springs
  useEffect(() => {
    rotateX.set(rotationAngles.x);
    rotateY.set(rotationAngles.y);
    rotateZ.set(rotationAngles.z);
  }, [rotationAngles, rotateX, rotateY, rotateZ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Adjust angles based on drag distance
    // Dragging horizontally rotates around Y axis. Dragging vertically rotates around X axis.
    // Adding a subtle Z twist proportional to horizontal movement for complete immersive depth.
    setRotationAngles((prev) => ({
      x: Math.max(-60, Math.min(60, prev.x - deltaY * 0.4)),
      y: Math.max(-80, Math.min(80, prev.y + deltaX * 0.4)),
      z: Math.max(-30, Math.min(30, prev.z + deltaX * 0.05)),
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset to default cinematic perspective angle
  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotationAngles({ x: 15, y: -25, z: 5 });
  };

  // Preset rotation angles for fast exploration
  const handlePreset = (preset: 'top' | 'front' | 'side', e: React.MouseEvent) => {
    e.stopPropagation();
    if (preset === 'top') setRotationAngles({ x: 45, y: 0, z: 0 });
    if (preset === 'front') setRotationAngles({ x: 0, y: 0, z: 0 });
    if (preset === 'side') setRotationAngles({ x: 10, y: 55, z: -5 });
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none group cursor-grab active:cursor-grabbing ${className || ''}`}
      style={{ perspective: 1200 }}
    >
      {/* Background ambient lighting reactive to rotation */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#3275F8]/5 via-transparent to-indigo-500/5 pointer-events-none" />
      <div className="absolute w-72 h-72 bg-[#3275F8]/10 blur-[120px] rounded-full pointer-events-none group-hover:bg-[#3275F8]/20 transition-all duration-700" />

      {/* Main 3D Tilted Plane */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          rotateZ,
          transformStyle: "preserve-3d",
        }}
        className="relative w-[80%] max-w-lg aspect-[16/10] rounded-[20px] transition-shadow duration-300"
      >
        {/* Shadow plane beneath the video to accentuate floating depth */}
        <div 
          className="absolute inset-0 rounded-[20px] bg-black/80 blur-2xl transform translate-y-12 translate-z-[-50px] opacity-60 pointer-events-none" 
        />

        {/* Outer dashed orbit axis ring (Y-axis orbit simulation) floating around the content */}
        <div 
          className="absolute inset-0 rounded-full border border-dashed border-white/20 scale-[1.35] pointer-events-none group-hover:border-white/40 transition-colors duration-500"
          style={{ transform: "translateZ(10px) rotateX(75deg)" }}
        />
        {/* Outer dashed orbit axis ring (X-axis orbit simulation) */}
        <div 
          className="absolute inset-0 rounded-full border border-dashed border-white/20 scale-[1.35] pointer-events-none group-hover:border-white/40 transition-colors duration-500"
          style={{ transform: "translateZ(10px) rotateY(75deg)" }}
        />
        {/* Outer dashed orbit axis ring (Z-axis orbit simulation) */}
        <div 
          className="absolute inset-0 rounded-full border border-dashed border-[#3275F8]/30 scale-[1.4] pointer-events-none group-hover:border-[#3275F8]/50 transition-colors duration-500"
          style={{ transform: "translateZ(0px)" }}
        />

        {/* Small orbital highlight satellite dots */}
        <div className="absolute top-0 left-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff] transform -translate-x-1/2 -translate-y-[25%] translate-z-[10px]" />
        <div className="absolute top-1/2 right-0 w-2 h-2 rounded-full bg-[#3275F8] shadow-[0_0_10px_#3275F8] transform translate-x-[25%] -translate-y-1/2 translate-z-[10px]" />

        {/* Inner Video Container embedded directly in the Rotatable 3D context */}
        <div className="relative w-full h-full rounded-[20px] overflow-hidden border border-white/15 bg-[#0a0a0a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center">
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover scale-[1.02]"
          />

          {/* Glassmorphic specular highlight lines mimicking premium liquid UI bevels */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />
          
          {/* Subtle Grid overlay on top of video to emphasize digital workspace editing matrix */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none mix-blend-overlay opacity-50" />
        </div>

        {/* Floating Node elements clipped to video plane sides to give a professional 3D editing perspective */}
        <div 
          className="absolute -left-6 top-1/3 px-2 py-1 rounded bg-black/80 backdrop-blur-md border border-white/10 text-white/70 text-[9px] uppercase tracking-widest pointer-events-none"
          style={{ transform: "translateZ(30px)" }}
        >
          2D Source
        </div>
        <div 
          className="absolute -right-6 bottom-1/3 px-2 py-1 rounded bg-[#3275F8]/90 backdrop-blur-md border border-white/20 text-white text-[9px] font-bold uppercase tracking-widest shadow-lg pointer-events-none"
          style={{ transform: "translateZ(50px)" }}
        >
          3D Scene
        </div>
      </motion.div>

      {/* Control panel & Interactive indicators overlaying container bottom */}
      <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-2 pointer-events-none z-20">
        {/* Live Coordinate telemetry tracker */}
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white/80 text-[10px] font-mono tracking-wider">
          <Compass className="w-3 h-3 text-[#3275F8] animate-spin-slow" />
          <span>X: {Math.round(rotationAngles.x)}°</span>
          <span>Y: {Math.round(rotationAngles.y)}°</span>
          <span>Z: {Math.round(rotationAngles.z)}°</span>
        </div>

        {/* Action controls enabled for direct click */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={(e) => handlePreset('front', e)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white text-[10px] font-medium transition-colors"
          >
            Front
          </button>
          <button
            onClick={(e) => handlePreset('side', e)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white text-[10px] font-medium transition-colors"
          >
            Side
          </button>
          <button
            onClick={(e) => handlePreset('top', e)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white text-[10px] font-medium transition-colors"
          >
            Top
          </button>
          <div className="w-px h-3 bg-white/10 mx-0.5" />
          <button
            onClick={handleReset}
            title="Reset Rotation"
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white transition-colors flex items-center justify-center"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Floating Prompt instruction tag on top */}
      <div className="absolute top-4 bg-white/5 backdrop-blur-md border border-white/10 text-white/60 px-3 py-1 rounded-full text-[10px] tracking-wide pointer-events-none group-hover:text-white/90 transition-colors">
        🖱️ Click & drag to orbit in 3D space
      </div>
    </div>
  );
}
