import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Download, TrendingUp, LogOut, ChevronLeft } from "lucide-react";
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
    href: "/dashboard/usage",
    icon: TrendingUp,
  },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white [--primary:220_94%_58%] [--primary-foreground:0_0%_100%]">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="fixed top-0 left-0 h-full w-[220px] flex flex-col border-r border-white/[0.06] bg-[#0D0D0D]/95 backdrop-blur-xl z-30">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <Link to="/" className="flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity">
            <ZenviLogo size={22} />
            <span className="text-[15px] font-semibold tracking-tight">Zenvi</span>
          </Link>
        </div>

        {/* Back to site */}
        <div className="px-4 pt-4 pb-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronLeft size={12} />
            Back to site
          </Link>
        </div>

        {/* Nav items */}
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

        {/* User / sign out */}
        <div className="px-4 py-4 border-t border-white/[0.06]">
          {userEmail && (
            <p className="text-[11px] text-white/30 truncate mb-3">{userEmail}</p>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 ml-[220px] min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
