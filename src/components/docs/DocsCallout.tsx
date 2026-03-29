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

const styles: Record<Variant, { border: string; icon: typeof Info; label: string }> = {
  tip: {
    border: "border-l-[#0066FF]",
    icon: Lightbulb,
    label: "Tip",
  },
  warning: {
    border: "border-l-amber-500",
    icon: AlertTriangle,
    label: "Warning",
  },
  info: {
    border: "border-l-white/25",
    icon: Info,
    label: "Note",
  },
};

export function DocsCallout({ children }: { children: ReactNode }) {
  const raw = flattenText(children);
  const variant = detectVariant(raw);
  const { border, icon: Icon, label } = styles[variant];

  return (
    <aside
      className={cn(
        "my-6 rounded-xl border border-white/[0.08] bg-white/[0.03] pl-4 pr-4 py-4 border-l-4",
        border,
      )}
    >
      <div className="flex gap-3">
        <Icon className="h-5 w-5 shrink-0 text-white/70 mt-0.5" aria-hidden />
        <div className="min-w-0 text-sm leading-relaxed text-white/85 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
          <span className="sr-only">{label}: </span>
          {children}
        </div>
      </div>
    </aside>
  );
}
