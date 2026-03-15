import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZenviLogo } from "@/components/ZenviLogo";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface NavbarProps {
  onOpenWaitlist: () => void;
  onOpenAccessCode: () => void;
}

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#" },
];

const Navbar = ({ onOpenWaitlist, onOpenAccessCode }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keep auth state in sync
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsUserMenuOpen(false);
  };

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/[0.06]"
            : ""
        }`}
      >
        <div className="mx-auto max-w-content px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="#" className="flex items-center text-white">
              <ZenviLogo size={28} />
            </a>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop right side */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                /* Signed-in: avatar + dropdown */
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-primary">
                        {userInitial}
                      </span>
                    </div>
                    <span className="text-sm text-white/70 max-w-[130px] truncate">
                      {user.email}
                    </span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-white/[0.08] bg-[#111111] shadow-xl overflow-hidden"
                      >
                        <Link
                          to="/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" />
                          Dashboard
                        </Link>
                        <div className="border-t border-white/[0.06]" />
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* Signed-out: Log in + Sign up */
                <>
                  <Link to="/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-sm text-muted-foreground hover:text-white hover:bg-white/5"
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-sm border-white/[0.10] text-white hover:bg-white/5 hover:border-white/20"
                    >
                      Sign up
                    </Button>
                  </Link>
                </>
              )}

              <Button
                onClick={onOpenAccessCode}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white text-sm font-medium px-5 rounded-lg ml-1"
              >
                Download Beta
              </Button>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{
          opacity: isMobileMenuOpen ? 1 : 0,
          height: isMobileMenuOpen ? "auto" : 0,
        }}
        className="fixed top-16 left-0 right-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-sm border-b border-white/[0.06] md:hidden overflow-hidden"
      >
        <div className="mx-auto max-w-content px-6 py-6">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-muted-foreground hover:text-white transition-colors py-2 text-base"
              >
                {link.label}
              </a>
            ))}

            <div className="border-t border-white/[0.06] pt-4 flex flex-col gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 py-1">
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{userInitial}</span>
                    </div>
                    <span className="text-sm text-white/70 truncate">{user.email}</span>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors py-1"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <button
                    onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors py-1 text-left"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-white/[0.10] text-white hover:bg-white/5">
                      Log in
                    </Button>
                  </Link>
                  <Link to="/signup" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-white/[0.10] text-white hover:bg-white/5">
                      Sign up
                    </Button>
                  </Link>
                </div>
              )}

              <Button
                onClick={() => { setIsMobileMenuOpen(false); onOpenAccessCode(); }}
                className="bg-primary hover:bg-primary/90 text-white font-medium w-full"
              >
                Download Beta
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Navbar;
