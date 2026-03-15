import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base: all buttons share these
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium tracking-[-0.01em] select-none",
    "transition-all duration-150",
    // Focus ring — plasma glow, always visible for keyboard users
    "focus-visible:outline-none",
    "focus-visible:ring-2 focus-visible:ring-plasma-500/70",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]",
    // Disabled
    "disabled:pointer-events-none disabled:opacity-40",
    // Active scale — tactile press feedback
    "active:scale-[0.97]",
    // Icon sizing
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        // ── cosmic: primary brand CTA — electric blue fill with glow ──
        cosmic: [
          "bg-plasma-500 text-white border border-plasma-500/80",
          "hover:bg-plasma-400 hover:border-plasma-400",
          "hover:shadow-[0_0_0_1px_rgba(0,102,255,0.4),0_0_20px_rgba(0,102,255,0.3),0_0_60px_rgba(0,102,255,0.15)]",
          "active:bg-plasma-600 active:border-plasma-600",
        ],

        // ── ghost-space: secondary action — bordered, translucent ──
        "ghost-space": [
          "bg-transparent text-white border border-white/10",
          "hover:bg-white/[0.04] hover:border-white/20",
        ],

        // ── nebula: creative/premium variant — purple glow ──
        nebula: [
          "bg-transparent text-nebula-300 border border-nebula-500/40",
          "hover:bg-nebula-900/40 hover:border-nebula-400/60",
          "hover:shadow-[0_0_0_1px_rgba(168,85,247,0.3),0_0_20px_rgba(168,85,247,0.2)]",
        ],

        // ── destructive: irreversible actions — infrared glow ──
        destructive: [
          "bg-transparent text-infrared-300 border border-infrared-500/40",
          "hover:bg-infrared-900/40 hover:border-infrared-400/60",
          "hover:shadow-[0_0_0_1px_rgba(232,24,24,0.3),0_0_20px_rgba(232,24,24,0.15)]",
        ],

        // ── ghost: tertiary / nav — no border ──
        ghost: [
          "bg-transparent text-stardust-300 border border-transparent",
          "hover:bg-white/[0.04] hover:text-white",
        ],

        // ── link: text link style ──
        link: [
          "bg-transparent text-plasma-300 border-transparent underline-offset-4",
          "hover:underline hover:text-plasma-200",
          "active:scale-100",
        ],

        // ── aurora: success/positive actions ──
        aurora: [
          "bg-aurora-500/15 text-aurora-300 border border-aurora-500/30",
          "hover:bg-aurora-500/25 hover:border-aurora-400/50",
          "hover:shadow-[0_0_0_1px_rgba(0,179,128,0.25),0_0_16px_rgba(0,179,128,0.15)]",
        ],

        // ── Backward compat aliases ──
        default:   [
          "bg-plasma-500 text-white border border-plasma-500/80",
          "hover:bg-plasma-400",
          "hover:shadow-[0_0_0_1px_rgba(0,102,255,0.3),0_0_16px_rgba(0,102,255,0.2)]",
        ],
        secondary: [
          "bg-white/[0.05] text-white border border-white/[0.06]",
          "hover:bg-white/[0.08] hover:border-white/[0.12]",
        ],
        outline: [
          "bg-transparent text-white border border-white/10",
          "hover:bg-white/[0.04] hover:border-white/20",
        ],
      },

      size: {
        sm:       "h-9 rounded-md px-3 text-[13px] [&_svg]:size-[14px]",
        default:  "h-10 rounded-md px-4 text-sm [&_svg]:size-4",
        md:       "h-10 rounded-md px-4 text-sm [&_svg]:size-4",
        lg:       "h-12 rounded-lg px-6 text-base [&_svg]:size-4",
        xl:       "h-14 rounded-lg px-8 text-lg [&_svg]:size-[18px]",
        icon:     "h-10 w-10 rounded-md [&_svg]:size-4",
        "icon-sm": "h-9 w-9 rounded-md [&_svg]:size-[14px]",
        "icon-lg": "h-12 w-12 rounded-lg [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "cosmic",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-busy={loading ? "true" : undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" aria-label="Loading" />
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
