import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download,
  Laptop,
  Monitor,
  Terminal,
  CheckCircle,
  ArrowLeft,
  Loader2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Release URLs — update these once GitHub CI/CD publishes artifacts
// ---------------------------------------------------------------------------
const GITHUB_RELEASES_BASE =
  "https://github.com/zenvi-app/zenvi-core/releases/latest/download";

const RELEASE_ARTIFACTS = {
  mac: {
    label: "macOS",
    sublabel: "macOS 12 Monterey or later",
    url: `${GITHUB_RELEASES_BASE}/Zenvi-macOS.dmg`,
    fileType: ".dmg",
    size: "~180 MB",
    icon: MacOSIcon,
  },
  windows: {
    label: "Windows",
    sublabel: "Windows 10 / 11 (64-bit)",
    url: `${GITHUB_RELEASES_BASE}/Zenvi-Windows-Setup.exe`,
    fileType: ".exe",
    size: "~165 MB",
    icon: WindowsIcon,
  },
  linux: {
    label: "Linux",
    sublabel: "Ubuntu 20.04+ / Debian-based",
    url: `${GITHUB_RELEASES_BASE}/Zenvi-Linux.AppImage`,
    fileType: ".AppImage",
    size: "~195 MB",
    icon: LinuxIcon,
  },
} as const;

type Platform = keyof typeof RELEASE_ARTIFACTS;

// ---------------------------------------------------------------------------
// Inline SVG platform icons (geometry only — no trademarked logos)
// ---------------------------------------------------------------------------
function MacOSIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Laptop silhouette */}
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M0 19h24" />
      <path d="M9 19v1a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1" />
    </svg>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      {/* 4-pane window grid */}
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  );
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Terminal prompt symbol */}
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M7 9l3 3-3 3" />
      <path d="M13 15h4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// OS detection
// ---------------------------------------------------------------------------
function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (ua.includes("Mac OS X") || ua.includes("Macintosh")) return "mac";
  if (ua.includes("Windows")) return "windows";
  return "linux";
}

// ---------------------------------------------------------------------------
// Token validation states
// ---------------------------------------------------------------------------
type TokenState = "loading" | "valid" | "invalid";

// ---------------------------------------------------------------------------
// Fade-in variants
// ---------------------------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function DownloadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [tokenState, setTokenState] = useState<TokenState>("loading");
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>("mac");
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Detect OS on mount
  useEffect(() => {
    setDetectedPlatform(detectPlatform());
  }, []);

  // Validate token
  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.rpc("validate_waitlist_token", {
          token,
        });

        if (error || !data || data.length === 0) {
          setTokenState("invalid");
        } else {
          setTokenState("valid");
        }
      } catch {
        setTokenState("invalid");
      }
    })();
  }, [token]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (tokenState === "loading") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  // ── Invalid token ─────────────────────────────────────────────────────────
  if (tokenState === "invalid") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
        <MinimalNav />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-sm"
          >
            <div className="w-14 h-14 rounded-full border border-white/[0.08] flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-3">
              Invalid access link
            </h1>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              This link doesn't look right, or may have expired. Check your
              invite email or join the waitlist to get early access.
            </p>
            <Link to="/">
              <Button
                variant="outline"
                className="border-white/[0.08] hover:bg-white/5 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Zenvi
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Valid token — Download page ───────────────────────────────────────────
  const primary = RELEASE_ARTIFACTS[detectedPlatform];
  const others = (Object.keys(RELEASE_ARTIFACTS) as Platform[]).filter(
    (p) => p !== detectedPlatform,
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <MinimalNav />

      <main className="flex-1 flex flex-col items-center px-6 py-20">
        <div className="w-full max-w-2xl">
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="flex justify-center mb-8"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary">
              <CheckCircle className="w-3 h-3" />
              Early Access Confirmed
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.06}
            className="text-center mb-4"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-none">
              You're in.
            </h1>
          </motion.div>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.12}
            className="text-center text-muted-foreground text-base mb-14 max-w-md mx-auto leading-relaxed"
          >
            Download Zenvi for{" "}
            <span className="text-white font-medium">{primary.label}</span> and
            start editing with AI.
          </motion.p>

          {/* Primary download card */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.18}
          >
            <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-6 mb-4">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg border border-white/[0.06] bg-white/[0.03] flex items-center justify-center text-white">
                    <primary.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-base">
                      Zenvi for {primary.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {primary.sublabel}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-1 rounded border border-primary/20 text-primary bg-primary/5 font-medium">
                  Beta
                </span>
              </div>

              <a href={primary.url} onClick={() => setDownloadStarted(true)}>
                <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium text-sm gap-2">
                  {downloadStarted ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Download started
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download for {primary.label}
                    </>
                  )}
                </Button>
              </a>

              <p className="text-center text-xs text-muted-foreground mt-3">
                {primary.fileType} · {primary.size}
              </p>
            </div>
          </motion.div>

          {/* Other platforms */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.24}
            className="mb-14"
          >
            <p className="text-xs text-muted-foreground text-center mb-3">
              Other platforms
            </p>
            <div className="grid grid-cols-2 gap-3">
              {others.map((p) => {
                const art = RELEASE_ARTIFACTS[p];
                return (
                  <a key={p} href={art.url}>
                    <div className="rounded-lg border border-white/[0.06] bg-[#0F0F0F] hover:border-white/[0.12] hover:bg-[#141414] transition-all duration-200 p-4 flex items-center gap-3 group cursor-pointer">
                      <div className="w-8 h-8 rounded-md border border-white/[0.06] flex items-center justify-center text-muted-foreground group-hover:text-white transition-colors">
                        <art.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium">
                          {art.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {art.fileType} · {art.size}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                );
              })}
            </div>
          </motion.div>

          {/* Next steps */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.3}
          >
            <div className="rounded-xl border border-white/[0.06] bg-[#0D0D0D] p-6">
              <h2 className="text-sm font-semibold text-white mb-5">
                What's next
              </h2>
              <div className="space-y-5">
                {NEXT_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full border border-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {i + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Minimal footer */}
      <motion.footer
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.36}
        className="border-t border-white/[0.06] py-6 px-6"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Zenvi</span>
          <p className="text-xs text-muted-foreground">
            Having trouble?{" "}
            <a
              href="mailto:support@zenvi.app"
              className="text-primary hover:underline"
            >
              support@zenvi.app
            </a>
          </p>
        </div>
      </motion.footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function MinimalNav() {
  return (
    <nav className="border-b border-white/[0.06] px-6 py-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-white tracking-tight">
          Zenvi
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to site
        </Link>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const NEXT_STEPS = [
  {
    title: "Install Zenvi",
    description:
      "Open the downloaded file and follow the installer. On macOS, drag Zenvi to your Applications folder.",
  },
  {
    title: "Launch and explore",
    description:
      "Start a new project or import existing footage. The AI chat panel is on the right — try describing what you want to create.",
  },
  {
    title: "Connect your AI models",
    description:
      "Open Preferences → AI to add your OpenAI or Anthropic API key. Zenvi uses your own keys so your data stays yours.",
  },
];
