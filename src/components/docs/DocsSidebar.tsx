import { Link, useLocation } from "react-router-dom";
import { docsNavGroups } from "@/docs/docs-nav";
import { cn } from "@/lib/utils";

type DocsSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function DocsSidebar({ onNavigate, className }: DocsSidebarProps) {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Documentation" className={cn("flex flex-col gap-7", className)}>
      {docsNavGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/35">
            {group.label}
          </p>
          <ul className="space-y-px border-l border-white/[0.05]">
            {group.items.map((item) => {
              const href = `/docs/${item.slug}`;
              const isActive = pathname === href;
              return (
                <li key={item.slug} className="relative">
                  {/* Active rail accent */}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute -left-px top-1 bottom-1 w-px bg-primary shadow-[0_0_8px_rgba(50,117,248,0.7)]"
                    />
                  )}
                  <Link
                    to={href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-1.5 text-[13px] leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isActive
                        ? "bg-white/[0.05] text-white font-medium"
                        : "text-white/55 hover:bg-white/[0.03] hover:text-white",
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
