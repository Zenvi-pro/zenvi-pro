import { cn } from "@/lib/utils";

export type TocHeading = { id: string; text: string; level: number };

type DocsTOCProps = {
  headings: TocHeading[];
  activeId: string | null;
};

export function DocsTOC({ headings, activeId }: DocsTOCProps) {
  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="On this page"
      className="hidden xl:block w-52 shrink-0 pl-2"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-4">
        On this page
      </p>
      <ul className="space-y-2.5 text-sm border-l border-white/[0.08] pl-4">
        {headings.map((h) => (
          <li
            key={h.id}
            style={{ paddingLeft: h.level >= 3 ? 8 : 0 }}
            className={cn("-ml-px border-l-2 border-transparent", activeId === h.id && "border-primary")}
          >
            <a
              href={`#${h.id}`}
              className={cn(
                "block py-0.5 leading-snug transition-colors focus-visible:outline-none focus-visible:text-primary",
                activeId === h.id ? "text-white font-medium" : "text-white/45 hover:text-white/80",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
