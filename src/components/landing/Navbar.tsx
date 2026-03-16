import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, LayoutDashboard, ArrowRight } from "lucide-react";
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
  { label: "Showcase", href: "#demo" },
  { label: "Pricing", href: "#pricing" },
];

const Navbar = ({ onOpenWaitlist, onOpenAccessCode }: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-4 left-0 right-0 z-50"
      >
        <div className="mx-auto max-w-content px-6">
          <div className="w-full hidden md:grid md:grid-cols-3 items-center">
            <a href="#" className="justify-self-start flex items-center text-white">
              <ZenviLogo size={42} />
            </a>

            {/* Desktop center pill nav */}
            <div className="justify-self-center flex items-center gap-2 rounded-full border border-white/10 bg-[#1A1A1A]/80 px-3 py-2 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-full px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop right pill actions */}
            <div className="justify-self-end flex items-center gap-3 rounded-full border border-white/10 bg-[#1A1A1A]/80 px-3 py-2 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="rounded-full px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="rounded-full px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="rounded-full px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Log in
                </Link>
              )}
              <Button
                onClick={onOpenAccessCode}
                size="sm"
                className="h-10 rounded-full bg-white px-5 text-sm font-medium text-black hover:bg-white/90"
              >
                Request Access
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile top row */}
          <div className="md:hidden flex items-center justify-between rounded-full border border-white/10 bg-[#1A1A1A]/80 px-4 py-2 backdrop-blur-xl">
            <a href="#" className="text-sm font-medium text-white">
              Zenvi
            </a>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-full hover:bg-white/5 transition-colors"
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
        className="fixed top-20 left-0 right-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-sm border-b border-white/[0.06] md:hidden overflow-hidden"
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
                className="bg-white hover:bg-white/90 text-black font-medium w-full rounded-full"
              >
                Request Access
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Navbar;
