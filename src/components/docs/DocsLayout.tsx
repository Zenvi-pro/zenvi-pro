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
    <div className="relative min-h-screen bg-transparent text-foreground">
      <a
        href="#docs-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(480px,55vh)] bg-[radial-gradient(ellipse_75%_45%_at_50%_-10%,rgba(0,102,255,0.16),transparent_65%)]"
        aria-hidden
      />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl supports-[backdrop-filter]:bg-black/60">
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
          <Link
            to="/download"
            className="text-sm text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
          >
            Download
          </Link>
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

      <div className="mx-auto flex max-w-[1600px] gap-0 px-4 pb-24 pt-8 lg:gap-8 lg:px-8 lg:pt-12">
        <aside className="hidden w-56 shrink-0 border-r border-white/[0.06] pr-6 lg:block xl:w-60 xl:pr-8">
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
