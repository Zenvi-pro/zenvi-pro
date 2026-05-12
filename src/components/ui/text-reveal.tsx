import { cn } from "@/lib/utils";

interface TextRevealProps {
  text: string;
  progress: number;
  className?: string;
  strikePhrase?: string;
  strikeAtProgress?: number;
  strikeProgress?: number;
}

export function TextReveal({
  text,
  progress,
  className,
  strikePhrase,
  strikeAtProgress = 0.99,
  strikeProgress,
}: TextRevealProps) {
  const chars = Array.from(text);
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const total = Math.max(chars.length - 1, 1);
  const shouldStrike = clampedProgress >= strikeAtProgress && Boolean(strikePhrase);
  const strikeStart = strikePhrase ? text.indexOf(strikePhrase) : -1;
  const strikeEnd = strikeStart >= 0 && strikePhrase ? strikeStart + strikePhrase.length : -1;
  
  const strikeScale = strikeProgress !== undefined 
    ? Math.max(0, Math.min(1, strikeProgress))
    : (shouldStrike ? 1 : 0);

  const renderChars = (source: string, offset: number) =>
    Array.from(source).map((char, idx) => {
      const absoluteIdx = offset + idx;
      const threshold = absoluteIdx / total;
      const active = clampedProgress >= threshold;
      return (
        <span
          key={`${char}-${absoluteIdx}`}
          className={cn(
            "transition-colors duration-200",
            active ? "text-white" : "text-white/25",
          )}
        >
          {char}
        </span>
      );
    });

  return (
    <p className={cn("text-balance leading-tight", className)}>
      {strikeStart >= 0 && strikeEnd > strikeStart ? (
        <>
          {renderChars(text.slice(0, strikeStart), 0)}
          <span className="relative inline-block">
            {renderChars(text.slice(strikeStart, strikeEnd), strikeStart)}
            <span
              className="pointer-events-none absolute left-[-4%] top-1/2 h-[3px] w-[108%] -translate-y-1/2 rounded-full bg-[#3275F8] shadow-[0_0_12px_rgba(50,117,248,0.8)]"
              style={{
                transform: `scaleX(${strikeScale})`,
                transformOrigin: "left center",
                transition: strikeProgress !== undefined ? "none" : "transform 2600ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </span>
          {renderChars(text.slice(strikeEnd), strikeEnd)}
        </>
      ) : (
        chars.map((char, idx) => {
          const threshold = idx / total;
          const active = clampedProgress >= threshold;
          return (
            <span
              key={`${char}-${idx}`}
              className={cn(
                "transition-colors duration-200",
                active ? "text-white" : "text-white/25",
              )}
            >
              {char}
            </span>
          );
        })
      )}
    </p>
  );
}
