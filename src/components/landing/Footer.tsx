import { Link } from "react-router-dom";
import { Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-[#111111] border-t border-white/[0.06]">
      <div className="mx-auto max-w-content px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-base font-bold text-white mb-3">Zenvi</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
              Professional video editing powered by on-device AI. Your footage never leaves your machine.
            </p>
            <a
              href="https://x.com/pro_zenvi"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg border border-white/[0.06] inline-flex items-center justify-center text-muted-foreground hover:text-white hover:border-white/10 transition-colors duration-200"
              aria-label="X (Twitter)"
            >
              <Twitter className="w-4 h-4" />
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-muted-foreground hover:text-white transition-colors duration-200">Features</a></li>
              <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-white transition-colors duration-200">Pricing</a></li>
              <li><Link to="/docs" className="text-sm text-muted-foreground hover:text-white transition-colors duration-200">Documentation</Link></li>
              <li><Link to="/login" className="text-sm text-muted-foreground hover:text-white transition-colors duration-200">Download</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-white transition-colors duration-200">Privacy</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-white transition-colors duration-200">Terms</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://x.com/pro_zenvi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-white transition-colors duration-200"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Zenvi, Inc. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built for creators who value privacy and speed.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
