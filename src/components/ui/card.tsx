import * as React from "react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   Card variants for the Zenvi space design system.
   All cards use glassmorphism — translucent backgrounds with
   backdrop-blur to create depth against the star field.
   ────────────────────────────────────────────────────────────── */

// ── Glass Card (standard) ────────────────────────────────────
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-xl border border-white/[0.07]",
      "bg-white/[0.03] backdrop-blur-sm",
      "text-white overflow-hidden",
      "transition-all duration-300",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

// ── Featured Card (nebula glow border) ───────────────────────
const FeaturedCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-2xl overflow-hidden",
      "bg-[rgba(18,18,46,0.80)] backdrop-blur-md",
      "shadow-glow-nebula",
      "transition-all duration-300",
      className
    )}
    {...props}
  />
));
FeaturedCard.displayName = "FeaturedCard";

// ── Interactive Card (hover lift) ────────────────────────────
const InteractiveCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-xl border border-white/[0.07]",
      "bg-white/[0.03] backdrop-blur-sm",
      "cursor-pointer",
      // Hover lift
      "transition-all duration-300",
      "hover:-translate-y-[2px] hover:bg-white/[0.06]",
      "hover:shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(0,102,255,0.15)]",
      "active:translate-y-0 active:scale-[0.99]",
      className
    )}
    {...props}
  />
));
InteractiveCard.displayName = "InteractiveCard";

// ── Cosmic Card (dark solid, plasma accent border) ────────────
const CosmicCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-xl overflow-hidden",
      "bg-space-800 text-white",
      "border-l-2 border-l-plasma-500 border-t border-t-white/[0.06]",
      "border-r border-r-white/[0.04] border-b border-b-white/[0.04]",
      "transition-all duration-300",
      className
    )}
    {...props}
  />
));
CosmicCard.displayName = "CosmicCard";

// ── Card sub-parts ────────────────────────────────────────────
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold tracking-[-0.01em] text-white leading-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-space-300 leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-3 p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  FeaturedCard,
  InteractiveCard,
  CosmicCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
