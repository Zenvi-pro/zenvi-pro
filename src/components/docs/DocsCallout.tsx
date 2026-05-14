import type { ReactNode } from "react";
import { Lightbulb, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "tip" | "warning" | "info";

function flattenText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (typeof node === "object" && "props" in node && node.props) {
    return flattenText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function detectVariant(text: string): Variant {
  const t = text.trim();
  if (/^(warning|caution)\s*[:\s]/i.test(t)) return "warning";
  if (/^(tip|pro tip)\s*[:\s]/i.test(t)) return "tip";
  return "info";
}

const styles: Record<Variant, { border: string; iconColor: string; icon: typeof Info; label: string }> = {
  tip: {
    border: "border-l-[#3275F8]",
    iconColor: "text-[#7DA8FF]",
    icon: Lightbulb,
    label: "Tip",
  },
  warning: {
    border: "border-l-amber-500",
    iconColor: "text-amber-400/90",
    icon: AlertTriangle,
    label: "Warning",
  },
  info: {
    border: "border-l-white/25",
    iconColor: "text-white/65",
    icon: Info,
    label: "Note",
  },
};

export function DocsCallout({ children }: { children: ReactNode }) {
  const raw = flattenText(children);
  const variant = detectVariant(raw);
  const { border, iconColor, icon: Icon, label } = styles[variant];

  return (
    <aside
      className={cn(
        "my-6 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 border-l-[3px]",
        border,
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", iconColor)} aria-hidden />
        <div className="min-w-0 text-[14.5px] leading-[1.65] text-white/85 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
          <span className="sr-only">{label}: </span>
          {children}
        </div>
      </div>
    </aside>
  );
}
