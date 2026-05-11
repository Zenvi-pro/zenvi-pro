import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { ZenviLogo } from "@/components/ZenviLogo";

interface NavbarProps {
  onOpenWaitlist?: () => void;
  onOpenAccessCode?: () => void;
}

const navLinks = [
  { label: "Company", href: "#company" },
  { label: "Enterprise", href: "#enterprise" },
  { label: "Pricing", href: "#pricing" },
  { label: "Techniques", href: "#techniques", isNew: true },
  { label: "Resources", href: "#resources" },
];

const Navbar = ({ onOpenWaitlist, onOpenAccessCode }: NavbarProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-black/60 backdrop-blur-2xl border-b border-white/[0.04]" : "bg-transparent"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-2 z-50">
            <ZenviLogo size={24} />
            <span className="text-white font-medium text-lg tracking-tight">Zenvi</span>
          </Link>

          {/* Center: Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-[14px] text-white/70 hover:text-white transition-colors flex items-center gap-2"
              >
                {link.label}
                {link.isNew && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold bg-white/10 text-white px-1.5 py-0.5 rounded-sm">
                    New
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Right: CTA (Desktop) */}
          <div className="hidden lg:flex items-center gap-6">
            <Link to="/careers" className="text-[14px] text-white/70 hover:text-white transition-colors">
              Careers
            </Link>
            <button 
              className="text-[14px] text-white hover:text-white/80 font-medium transition-colors"
            >
              Contact sales
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden z-50 text-white p-2 -mr-2"
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
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-3xl pt-24 px-6 flex flex-col gap-6"
          >
             {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-medium text-white/80 hover:text-white flex items-center justify-between"
              >
                {link.label}
                {link.isNew && (
                  <span className="text-xs uppercase tracking-wider font-semibold bg-white/10 text-white px-2 py-1 rounded-sm">
                    New
                  </span>
                )}
              </Link>
            ))}
            <div className="w-full h-px bg-white/10 my-4" />
            <Link to="/careers" onClick={() => setMobileMenuOpen(false)} className="text-xl text-white/80">Careers</Link>
            <button className="text-xl text-left text-white">Contact sales</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
