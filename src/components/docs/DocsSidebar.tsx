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
    <nav aria-label="Documentation" className={cn("flex flex-col gap-8", className)}>
      {docsNavGroups.map((group) => (
        <div key={group.label}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35 mb-3 px-1">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const href = `/docs/${item.slug}`;
              const isActive = pathname === href;
              return (
                <li key={item.slug}>
                  <Link
                    to={href}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isActive
                        ? "bg-white/[0.08] text-white font-medium"
                        : "text-white/55 hover:bg-white/[0.04] hover:text-white",
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
