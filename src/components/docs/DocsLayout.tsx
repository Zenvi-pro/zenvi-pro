import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { ZenviLogo } from "@/components/ZenviLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DocsSidebar } from "./DocsSidebar";

export default function DocsLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div
      className="relative min-h-screen bg-[#0A0A0A] text-foreground [--primary:220_94%_58%] [--primary-foreground:0_0%_100%]"
    >
      <a
        href="#docs-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>
      {/* Ambient brand-blue glow at the top — refined Flora touch */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(520px,60vh)] bg-[radial-gradient(ellipse_70%_45%_at_50%_-8%,rgba(50,117,248,0.18),transparent_68%)]"
        aria-hidden
      />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0A0A0A]/85 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0A0A0A]/70">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 lg:px-8">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-white/80 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open documentation navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          >
            <ZenviLogo size={28} />
            <span className="hidden font-semibold tracking-tight sm:inline">Zenvi</span>
          </Link>
          <span className="hidden text-white/20 sm:inline" aria-hidden>
            /
          </span>
          <Link
            to="/docs"
            className="hidden text-sm text-white/55 transition-colors hover:text-white sm:inline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Docs
          </Link>
          <div className="min-w-4 flex-1" />
          <a
            href="https://github.com/Zenvi-pro"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-sm text-white/55 transition-colors hover:text-white sm:inline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
          >
            GitHub
          </a>
          <a
            href="/login?mode=signup"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-4 text-[12.5px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Get early access
          </a>
        </div>
      </header>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[min(100%,20rem)] border-white/[0.08] bg-[#0f0f0f] p-0"
        >
          <div className="border-b border-white/[0.06] px-6 py-5">
            <p className="text-lg font-semibold tracking-tight text-white">Documentation</p>
            <p className="mt-1 text-xs text-white/45">Guides for the Zenvi editor</p>
          </div>
          <div className="overflow-y-auto px-4 py-5 max-h-[calc(100vh-6rem)]">
            <DocsSidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="relative z-10 mx-auto flex max-w-[1600px] gap-0 px-4 pb-24 pt-10 lg:gap-10 lg:px-8 lg:pt-14">
        <aside className="hidden w-56 shrink-0 border-r border-white/[0.06] pr-6 lg:block xl:w-64 xl:pr-8">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-8">
            <DocsSidebar />
          </div>
        </aside>
        <main
          id="docs-main"
          tabIndex={-1}
          className="min-w-0 flex-1 scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] rounded-sm"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
