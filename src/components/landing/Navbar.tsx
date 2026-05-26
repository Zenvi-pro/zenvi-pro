import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { ZenviLogo } from "@/components/ZenviLogo";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { supabase } from "@/integrations/supabase/client";

interface NavbarProps {
  onOpenWaitlist?: () => void;
  onOpenAccessCode?: () => void;
  isIntroActive?: boolean;
}

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Showcase", href: "/#showcase" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
];

const Navbar = ({ onOpenWaitlist, onOpenAccessCode, isIntroActive }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Track auth state reactively — no page reload needed
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(!!s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    navigate("/");
  };

  // For "/#anchor" links: if we're already on home, smooth-scroll to the section.
  // Otherwise navigate home with the hash — Index.tsx scrolls on mount.
  const handleAnchorClick = (href: string) => (e: React.MouseEvent) => {
    if (!href.startsWith("/#")) return;
    const id = href.slice(2);
    setMobileMenuOpen(false);
    if (location.pathname === "/") {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none pt-8 px-8 md:px-12"
      >
        <div className="flex items-center justify-between relative">
          
          {/* Left: Logo */}
          <div className="pointer-events-auto flex items-center">
            <Link
              to="/"
              className="opacity-90 hover:opacity-100 transition-opacity"
              style={{ opacity: isIntroActive ? 0 : undefined }}
              data-zenvi-logo-target
            >
              <ZenviLogo size={32} />
            </Link>
          </div>

          {/* Center: Floating Island Links (Desktop) */}
          <div className="hidden lg:flex pointer-events-auto absolute left-1/2 -translate-x-1/2">
            <HoverBorderGradient
              as="div"
              containerClassName="rounded-[32px] p-0 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
              className="flex items-center gap-8 bg-[#0F0F0F] px-8 py-3"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={handleAnchorClick(link.href)}
                  className="text-[13px] font-medium text-white/60 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </HoverBorderGradient>
          </div>

          {/* Right: Floating Island CTA (Desktop) */}
          <div className="hidden lg:flex pointer-events-auto items-center">
            <HoverBorderGradient
              as="div"
              containerClassName="rounded-[32px] p-0 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
              className="flex items-center gap-5 bg-[#0F0F0F] p-1.5 pl-6"
            >
              {session ? (
                <>
                  <button
                    onClick={handleSignOut}
                    className="text-[13px] text-white/60 hover:text-white transition-colors font-medium"
                  >
                    Sign Out
                  </button>
                  <Link
                    to="/dashboard"
                    className="bg-white text-black text-[13px] font-semibold rounded-[24px] px-5 py-2.5 flex items-center gap-2 hover:bg-white/90 transition-all active:scale-95"
                  >
                    <LayoutDashboard size={14} className="stroke-[2.5px]" />
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-[13px] text-white/60 hover:text-white transition-colors font-medium"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/login?mode=signup"
                    className="bg-white text-black text-[13px] font-semibold rounded-[24px] px-5 py-2.5 flex items-center gap-2 hover:bg-white/90 transition-all active:scale-95"
                  >
                    Join Waitlist <ArrowRight size={14} className="stroke-[2.5px]" />
                  </Link>
                </>
              )}
            </HoverBorderGradient>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden pointer-events-auto z-50 bg-[#0F0F0F] border border-white/10 rounded-[24px] p-3 text-white backdrop-blur-xl shadow-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-3xl pt-28 px-8 flex flex-col gap-6"
          >
             {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={handleAnchorClick(link.href)}
                className="text-2xl font-medium text-white/80 hover:text-white flex items-center justify-between"
              >
                {link.label}
              </Link>
            ))}
            <div className="w-full h-px bg-white/10 my-4" />
            {session ? (
              <>
                <Link
                  to="/download"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xl font-semibold text-white flex items-center gap-2"
                >
                  <LayoutDashboard size={20} /> Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-xl text-left text-white/60 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xl text-left text-white/80 hover:text-white block"
                >
                  Log in
                </Link>
                <Link
                  to="/login?mode=signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xl text-left font-semibold text-white mt-2 block"
                >
                  Join Waitlist
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
