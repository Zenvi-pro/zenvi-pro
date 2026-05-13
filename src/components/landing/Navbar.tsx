import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { ZenviLogo } from "@/components/ZenviLogo";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

interface NavbarProps {
  onOpenWaitlist?: () => void;
  onOpenAccessCode?: () => void;
}

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Showcase", href: "/#showcase" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/#docs" },
];

const Navbar = ({ onOpenWaitlist, onOpenAccessCode }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
            <Link to="/" className="opacity-90 hover:opacity-100 transition-opacity">
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
              <a
                href="https://zenvi.pro/login"
                className="text-[13px] text-white/60 hover:text-white transition-colors font-medium"
              >
                Log in
              </a>
              <a
                href="https://zenvi.pro/login?mode=signup"
                className="bg-white text-black text-[13px] font-semibold rounded-[24px] px-5 py-2.5 flex items-center gap-2 hover:bg-white/90 transition-all active:scale-95"
              >
                Join Waitlist <ArrowRight size={14} className="stroke-[2.5px]" />
              </a>
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
            <a
              href="https://zenvi.pro/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xl text-left text-white/80 hover:text-white block"
            >
              Log in
            </a>
            <a
              href="https://zenvi.pro/login?mode=signup"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xl text-left font-semibold text-white mt-2 block"
            >
              Join Waitlist
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
