import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Twitter, Instagram, Youtube, Linkedin, Github, ArrowUpRight } from "lucide-react";
import { ZenviLogo } from "@/components/ZenviLogo";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="docs" className="bg-black text-white w-full">

      {/* Top CTA Section */}
      <section
        aria-labelledby="footer-cta-heading"
        className="relative isolate overflow-hidden border-t border-white/[0.08]"
      >
        {/* Soft brand-blue glow, off-center for depth without screaming */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[30%] top-1/2 h-[280px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3275F8]/10 blur-[120px]" />
        </div>

        <div className="relative z-20 mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-28 md:flex-row md:items-end md:justify-between md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl"
          >
            <h2
              id="footer-cta-heading"
              className="font-serif text-balance text-[44px] leading-[1.02] tracking-[-0.015em] text-white md:text-[60px] lg:text-[72px]"
            >
              Yours by default.
              <span className="block italic text-white/95">Early access.</span>
            </h2>
            <p className="mt-5 text-[14px] leading-relaxed text-white/45 md:text-[15px]">
              Local-first. Your footage stays on your machine until you decide otherwise.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="flex shrink-0 items-center gap-7"
          >
            <a
              href="https://calendly.com/nilay800/zenvi"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative text-[13px] font-medium text-white/65 transition-colors hover:text-white"
            >
              Talk to us
              <span
                aria-hidden="true"
                className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover:scale-x-100"
              />
            </a>
            <a
              href="https://zenvi.pro/login?mode=signup"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13px] font-semibold tracking-tight text-black shadow-[0_8px_28px_-8px_rgba(255,255,255,0.3)] transition-all duration-300 hover:shadow-[0_14px_42px_-8px_rgba(50,117,248,0.4)] active:scale-[0.98]"
            >
              Get early access
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Main Footer Block */}
      <div className="w-full relative mt-10">

        {/* Outer Rounded Container with Background Image/Video Placeholder */}
        <div className="relative w-full min-h-[500px] rounded-t-[40px] overflow-hidden border-t border-x border-white/10 bg-[#050505]">

          {/* Background Video Placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black opacity-30" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-luminosity" />

          {/* Dark Overlay (Black transparent cover) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />

          {/* Huge Faint Background Text */}
          <div className="absolute bottom-[-10%] left-0 right-0 flex justify-center pointer-events-none select-none opacity-[0.04]">
            <span className="text-[200px] md:text-[350px] font-serif tracking-widest text-white leading-none whitespace-nowrap">
              ZENVI
            </span>
          </div>

          {/* Footer Content */}
          <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-20 flex flex-col md:flex-row justify-between gap-16">

            {/* Left Column: Logo, Copyright, Socials */}
            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-4">
                <ZenviLogo size={24} />
                <div className="text-white/40 text-[11px] leading-relaxed">
                  <p>Copyright © {currentYear}</p>
                  <p>All rights reserved.</p>
                </div>
              </div>

              <div className="flex items-center gap-5 text-white/40">
                <a href="#" className="hover:text-white transition-colors"><Twitter size={16} /></a>
                <a href="#" className="hover:text-white transition-colors"><Instagram size={16} /></a>
                <a href="#" className="hover:text-white transition-colors"><Youtube size={16} /></a>
                {/* TikTok icon placeholder */}
                <a href="#" className="hover:text-white transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>
                </a>
                <a href="#" className="hover:text-white transition-colors"><Linkedin size={16} /></a>
                <a href="#" className="hover:text-white transition-colors"><Github size={16} /></a>
              </div>
            </div>

            {/* Right Column: Links Grid */}
            <div className="flex flex-wrap gap-16 md:gap-24 text-[12px]">

              {/* Company */}
              <div className="flex flex-col gap-3">
                <h4 className="text-white font-medium mb-2">Company</h4>
                <Link to="/blog" className="text-white/50 hover:text-white transition-colors">Blog</Link>
                <Link to="/careers" className="text-white/50 hover:text-white transition-colors">Careers</Link>
                <a href="#" className="text-white/50 hover:text-white transition-colors">Community</a>
                <Link to="/manifesto" className="text-white/50 hover:text-white transition-colors">Manifesto</Link>
              </div>

              {/* Product */}
              <div className="flex flex-col gap-3">
                <h4 className="text-white font-medium mb-2">Product</h4>
                <Link to="/updates" className="text-white/50 hover:text-white transition-colors">Updates</Link>
                <Link to="/pricing" className="text-white/50 hover:text-white transition-colors">Pricing</Link>
                <Link to="/enterprise" className="text-white/50 hover:text-white transition-colors">Teams</Link>
                <Link to="/contact" className="text-white/50 hover:text-white transition-colors">Sales</Link>
                <Link to="/capabilities" className="text-white/50 hover:text-white transition-colors">Capabilities</Link>
                <Link to="/partners" className="text-white/50 hover:text-white transition-colors">Affiliates</Link>
              </div>

              {/* Resources */}
              <div className="flex flex-col gap-3">
                <h4 className="text-white font-medium mb-2">Resources</h4>
                <Link to="/articles" className="text-white/50 hover:text-white transition-colors">Articles</Link>
                <a href="https://docs.zenvi.ai" className="text-white/50 hover:text-white transition-colors">Docs</a>
                <a href="mailto:support@zenvi.ai" className="text-white/50 hover:text-white transition-colors">Support</a>
                <Link to="/brand" className="text-white/50 hover:text-white transition-colors">Brand</Link>
                <a href="https://status.zenvi.ai" className="text-white/50 hover:text-white transition-colors">Status</a>
                <Link to="/privacy-policy" className="text-white/50 hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms-of-service" className="text-white/50 hover:text-white transition-colors">Terms of Service</Link>
              </div>

            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}
