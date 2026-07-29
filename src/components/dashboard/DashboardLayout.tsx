import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Download, TrendingUp, LogOut, ChevronLeft, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ZenviLogo } from "@/components/ZenviLogo";

const sidebarNav = [
  {
    label: "Download",
    href: "/dashboard/download",
    icon: Download,
  },
  {
    label: "Usage & Spending",
    shortLabel: "Usage",
    href: "/dashboard/usage",
    icon: TrendingUp,
  },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login?next=/dashboard");
        return;
      }
      setUserEmail(session.user.email ?? null);
    });
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden [--primary:220_94%_58%] [--primary-foreground:0_0%_100%]">
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="fixed top-0 left-0 hidden h-full w-[220px] lg:flex flex-col border-r border-white/[0.06] bg-[#0D0D0D]/95 backdrop-blur-xl z-30">
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <Link to="/" className="flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity">
            <ZenviLogo size={22} />
            <span className="text-[15px] font-semibold tracking-tight">Zenvi</span>
          </Link>
        </div>

        <div className="px-4 pt-4 pb-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronLeft size={12} />
            Back to site
          </Link>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {sidebarNav.map(({ label, href, icon: Icon }) => (
            <NavLink
              key={href}
              to={href}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-white/[0.06] text-white"
                    : "text-white/55 hover:text-white hover:bg-white/[0.03]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 bottom-1.5 w-px bg-primary shadow-[0_0_8px_rgba(50,117,248,0.7)]"
                    />
                  )}
                  <Icon size={15} className="shrink-0" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/[0.06]">
          {userEmail && (
            <p className="text-[11px] text-white/30 truncate mb-3">{userEmail}</p>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0D0D0D]/95 px-4 backdrop-blur-xl lg:hidden">
        <Link to="/" className="flex items-center gap-2 opacity-90">
          <ZenviLogo size={20} />
          <span className="text-[14px] font-semibold tracking-tight">Zenvi</span>
        </Link>
        <button
          type="button"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* ── Mobile slide-over menu ───────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-14 right-0 bottom-0 z-50 flex w-[min(300px,88vw)] flex-col border-l border-white/[0.06] bg-[#0D0D0D] lg:hidden"
            >
              <nav className="flex-1 space-y-1 px-3 py-4">
                {sidebarNav.map(({ label, href, icon: Icon }) => (
                  <NavLink
                    key={href}
                    to={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-3 text-[14px] font-medium transition-colors ${
                        isActive
                          ? "bg-white/[0.06] text-white"
                          : "text-white/60 hover:bg-white/[0.03] hover:text-white"
                      }`
                    }
                  >
                    <Icon size={16} className="shrink-0" />
                    {label}
                  </NavLink>
                ))}
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-[14px] font-medium text-white/60 hover:bg-white/[0.03] hover:text-white"
                >
                  <ChevronLeft size={16} className="shrink-0" />
                  Back to site
                </Link>
              </nav>
              <div className="border-t border-white/[0.06] px-4 py-4">
                {userEmail && (
                  <p className="mb-3 truncate text-[11px] text-white/30">{userEmail}</p>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-[13px] text-white/45 hover:text-white/80"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 min-h-screen w-full min-w-0 overflow-x-hidden overflow-y-auto pt-14 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:ml-[220px] lg:pt-0 lg:pb-0">
        <Outlet />
      </main>

      {/* ── Mobile bottom tabs ───────────────────────────────────────── */}
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/[0.06] bg-[#0D0D0D]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        {sidebarNav.map(({ label, shortLabel, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium tracking-wide transition-colors ${
                isActive ? "text-primary" : "text-white/45"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
                <span>{shortLabel ?? label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
