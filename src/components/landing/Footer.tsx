import { Twitter, MessageCircle, Github } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Download", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "Tutorials", href: "#" },
    { label: "Community", href: "#" },
    { label: "Support", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Licenses", href: "#" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "#", label: "X (Twitter)" },
  { icon: MessageCircle, href: "#", label: "Discord" },
  { icon: Github, href: "#", label: "GitHub" },
];

const Footer = () => {
  return (
    <footer className="bg-[#111111] border-t border-white/[0.06]">
      <div className="mx-auto max-w-content px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <h3 className="text-lg font-bold text-white mb-3">Zenvi</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
              Professional video editing powered by on-device AI. Your footage
              never leaves your machine.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-9 h-9 rounded-lg border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-white hover:border-white/10 transition-colors duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
