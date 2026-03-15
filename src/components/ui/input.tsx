import * as React from "react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   Input — Zenvi Space Edition
   Translucent bg, plasma glow on focus, infrared on error.
   ────────────────────────────────────────────────────────────── */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, hasError, leadingIcon, trailingIcon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leadingIcon && (
          <div
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-space-400 [&_svg]:size-4"
            aria-hidden="true"
          >
            {leadingIcon}
          </div>
        )}

        <input
          type={type}
          ref={ref}
          className={cn(
            // Layout
            "flex h-10 w-full rounded-md text-sm text-white",
            // Background & border
            "bg-white/[0.03] border",
            // Placeholder
            "placeholder:text-space-400",
            // File input
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white",
            // Transitions
            "transition-all duration-150",
            // Focus — plasma glow ring
            "focus-visible:outline-none",
            "focus-visible:border-plasma-500/60",
            "focus-visible:shadow-[0_0_0_3px_rgba(0,102,255,0.15),0_0_20px_rgba(0,102,255,0.08)]",
            // Disabled
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-white/[0.01]",
            // Error vs normal border
            hasError
              ? ["border-infrared-500/60", "shadow-[0_0_0_3px_rgba(232,24,24,0.10)]"]
              : ["border-white/[0.08]", "hover:border-white/[0.15]"],
            // Icon padding
            leadingIcon  ? "pl-9" : "px-3",
            trailingIcon ? "pr-9" : "",
            "py-2",
            className
          )}
          {...props}
        />

        {trailingIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-space-400 [&_svg]:size-4">
            {trailingIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

/* ──────────────────────────────────────────────────────────────
   FormField — compound: label + input + helper/error text
   ────────────────────────────────────────────────────────────── */

interface FormFieldProps {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

const FormField = ({
  label,
  id,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    <label htmlFor={id} className="text-sm font-medium text-space-200">
      {label}
      {required && (
        <span className="ml-1 text-infrared-400" aria-hidden="true">
          *
        </span>
      )}
    </label>

    {children}

    {error && (
      <p
        id={`${id}-error`}
        className="flex items-center gap-1 text-xs text-infrared-300"
        role="alert"
        aria-live="polite"
      >
        {error}
      </p>
    )}

    {hint && !error && (
      <p id={`${id}-hint`} className="text-xs text-space-400">
        {hint}
      </p>
    )}
  </div>
);
FormField.displayName = "FormField";

export { Input, FormField };
