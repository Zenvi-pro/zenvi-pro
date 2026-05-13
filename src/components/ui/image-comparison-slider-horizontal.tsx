import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageComparisonSliderProps extends React.HTMLAttributes<HTMLDivElement> {
  leftImage: string;
  rightImage: string;
  altLeft?: string;
  altRight?: string;
  initialPosition?: number;
}

export const ImageComparisonSlider = React.forwardRef<
  HTMLDivElement,
  ImageComparisonSliderProps
>(
  (
    {
      className,
      leftImage,
      rightImage,
      altLeft = "Left image",
      altRight = "Right image",
      initialPosition = 50,
      ...props
    },
    ref
  ) => {
    const [sliderPosition, setSliderPosition] = React.useState(initialPosition);
    const [isDragging, setIsDragging] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleMove = (clientX: number) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      let newPosition = (x / rect.width) * 100;

      newPosition = Math.max(0, Math.min(100, newPosition));
      setSliderPosition(newPosition);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      handleMove(e.touches[0].clientX);
    };
    
    const handleInteractionStart = () => {
      setIsDragging(true);
    };

    const handleInteractionEnd = () => {
      setIsDragging(false);
    };

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("touchmove", handleTouchMove);
        document.addEventListener("mouseup", handleInteractionEnd);
        document.addEventListener("touchend", handleInteractionEnd);
        document.body.style.cursor = 'ew-resize';
      } else {
        document.body.style.cursor = '';
      }

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("mouseup", handleInteractionEnd);
        document.removeEventListener("touchend", handleInteractionEnd);
        document.body.style.cursor = '';
      };
    }, [isDragging]);

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative w-full h-full overflow-hidden select-none group rounded-[16px]",
          className
        )}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
        {...props}
      >
        {/* Right Image (bottom layer - after colorization) */}
        <img
          src={rightImage}
          alt={altRight}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        
        {/* Left Image (top layer, clipped - before colorization) */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
          style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
        >
          <img
            src={leftImage}
            alt={altLeft}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Slider Handle and Divider */}
        <div
          className="absolute top-0 h-full w-1 cursor-ew-resize z-20"
          style={{ left: `calc(${sliderPosition}% - 2px)` }}
        >
          {/* Divider Line */}
          <div className="absolute inset-y-0 w-[2px] bg-white/70 shadow-[0_0_10px_rgba(0,0,0,0.5)] backdrop-blur-sm"></div>
          
          {/* Handle */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white shadow-2xl backdrop-blur-xl",
              "transition-all duration-300 ease-in-out",
              "group-hover:scale-110 group-hover:bg-white/20 group-hover:border-white/40",
              isDragging && "scale-110 bg-white/30 border-white/50 shadow-[0_0_20px_rgba(50,117,248,0.5)]"
            )}
            role="slider"
            aria-valuenow={sliderPosition}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-orientation="horizontal"
            aria-label="Image comparison slider"
          >
            <div className="flex items-center text-white/90">
              <ChevronLeft className="h-4 w-4 -mr-0.5 drop-shadow-md" />
              <ChevronRight className="h-4 w-4 -ml-0.5 drop-shadow-md" />
            </div>
          </div>

          {/* Small Before/After floating labels visible on hover */}
          <div className="absolute top-3 -translate-x-full pr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <span className="bg-black/60 backdrop-blur-md text-white/80 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider border border-white/10">
              Before
            </span>
          </div>
          <div className="absolute top-3 pl-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <span className="bg-[#3275F8]/80 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider border border-white/20">
              Graded
            </span>
          </div>
        </div>
      </div>
    );
  }
);

ImageComparisonSlider.displayName = "ImageComparisonSlider";
