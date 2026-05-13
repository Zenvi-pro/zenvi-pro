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
      className="hidden w-56 shrink-0 pl-2 xl:block"
    >
      <div className="sticky top-24">
        <p className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/40">
          On this page
        </p>
        <ul className="space-y-2 border-l border-white/[0.07] pl-4 text-[13px]">
          {headings.map((h) => (
            <li
              key={h.id}
              style={{ paddingLeft: h.level >= 3 ? 10 : 0 }}
              className={cn(
                "-ml-[17px] border-l-2 border-transparent pl-[13px] transition-colors",
                activeId === h.id && "border-primary shadow-[inset_2px_0_8px_-2px_rgba(50,117,248,0.55)]",
              )}
            >
              <a
                href={`#${h.id}`}
                className={cn(
                  "block py-0.5 leading-snug transition-colors focus-visible:outline-none focus-visible:text-primary",
                  activeId === h.id
                    ? "text-white font-medium"
                    : "text-white/45 hover:text-white/85",
                )}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
