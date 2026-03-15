import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZenviLogo } from "@/components/ZenviLogo";

interface NavbarProps {
  onOpenWaitlist: () => void;
}

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#" },
];

const Navbar = ({ onOpenWaitlist }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

            {/* Desktop navigation */}
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

            {/* CTA */}
            <div className="hidden md:flex items-center">
              <Button
                onClick={onOpenWaitlist}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white text-sm font-medium px-5 rounded-lg"
              >
                Download Beta
              </Button>
            </div>

            {/* Mobile menu button */}
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
            <Button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenWaitlist();
              }}
              className="bg-primary hover:bg-primary/90 text-white font-medium w-full mt-2"
            >
              Download Beta
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Navbar;
