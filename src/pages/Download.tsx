import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download,
  CheckCircle,
  ArrowLeft,
  Loader2,
  XCircle,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// GitHub release types & fetch
// ---------------------------------------------------------------------------
interface GithubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
}

interface GithubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: GithubAsset[];
}

async function fetchLatestRelease(): Promise<GithubRelease | null> {
  const res = await fetch(
    "https://api.github.com/repos/Zenvi-pro/zenvi-core/releases/latest",
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (res.status === 404) return null; // no releases yet
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function findAsset(assets: GithubAsset[], ext: string): GithubAsset | undefined {
  return assets.find((a) => a.name.endsWith(ext));
}

// ---------------------------------------------------------------------------
// Platform metadata (static display info only — URLs come from GitHub API)
// ---------------------------------------------------------------------------
type Platform = "mac" | "windows" | "linux";

const PLATFORM_META: Record<
  Platform,
  { label: string; sublabel: string; icon: React.FC<{ className?: string }>; ext: string }
> = {
  mac: {
    label: "macOS",
    sublabel: "macOS 12 Monterey or later",
    icon: MacOSIcon,
    ext: ".dmg",
  },
  windows: {
    label: "Windows",
    sublabel: "Windows 10 / 11 (64-bit)",
    icon: WindowsIcon,
    ext: ".exe",
  },
  linux: {
    label: "Linux",
    sublabel: "Ubuntu 20.04+ / Debian-based",
    icon: LinuxIcon,
    ext: ".AppImage",
  },
};

// Extra entry for .deb (Linux secondary)
const DEB_META = {
  label: "Linux (Debian)",
  sublabel: "Ubuntu 20.04+ / Debian-based",
  icon: LinuxIcon,
  ext: ".deb",
};

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
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M0 19h24" />
      <path d="M9 19v1a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1" />
    </svg>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
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
type TokenState = "loading" | "valid" | "invalid" | "no-plan";

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

  // Check subscription access
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setTokenState("invalid");
          return;
        }

        // Require an active subscription to access downloads
        const { data: sub } = await supabase.rpc("get_user_subscription");
        if (sub && sub.length > 0) {
          setTokenState("valid");
        } else {
          setTokenState("no-plan");
        }
      } catch {
        setTokenState("invalid");
      }
    })();
  }, [token]);

  // Fetch latest GitHub release (runs regardless of token state)
  const {
    data: release,
    isError: releaseError,
  } = useQuery<GithubRelease | null>({
    queryKey: ["zenvi-latest-release"],
    queryFn: fetchLatestRelease,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ── Loading state ─────────────────────────────────────────────────────────
  if (tokenState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  // ── No active plan ────────────────────────────────────────────────────────
  if (tokenState === "no-plan") {
    return (
      <div className="min-h-screen flex flex-col">
        <MinimalNav />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-sm"
          >
            <div className="w-14 h-14 rounded-full border border-white/[0.08] flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-7 h-7 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-3">
              No active plan
            </h1>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              You need an active Zenvi subscription to download the app.
            </p>
            <Link to="/#pricing">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                View plans
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Invalid token ─────────────────────────────────────────────────────────
  if (tokenState === "invalid") {
    return (
      <div className="min-h-screen flex flex-col">
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
  const primaryMeta = PLATFORM_META[detectedPlatform];
  const others = (Object.keys(PLATFORM_META) as Platform[]).filter(
    (p) => p !== detectedPlatform,
  );

  const getAsset = (ext: string): GithubAsset | null =>
    release?.assets ? (findAsset(release.assets, ext) ?? null) : null;

  const primaryAsset = getAsset(primaryMeta.ext);

  // Build secondary cards list
  const secondaryCards = others.map((p) => ({ meta: PLATFORM_META[p], asset: getAsset(PLATFORM_META[p].ext) }));
  // If Linux is primary, also add .deb as a secondary option
  if (detectedPlatform === "linux") {
    secondaryCards.push({ meta: DEB_META, asset: getAsset(".deb") });
  }

  return (
    <div className="min-h-screen flex flex-col">
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
            <span className="text-white font-medium">{primaryMeta.label}</span>{" "}
            and start editing with AI.
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
                    <primaryMeta.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-base">
                      Zenvi for {primaryMeta.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {primaryMeta.sublabel}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-1 rounded border border-primary/20 text-primary bg-primary/5 font-medium">
                  {release?.tag_name ?? "Beta"}
                </span>
              </div>

              {primaryAsset ? (
                <a
                  href={primaryAsset.browser_download_url}
                  onClick={() => setDownloadStarted(true)}
                >
                  <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium text-sm gap-2">
                    {downloadStarted ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Download started
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download for {primaryMeta.label}
                      </>
                    )}
                  </Button>
                </a>
              ) : (
                <Button
                  disabled
                  className="w-full h-12 opacity-50 text-white font-medium text-sm gap-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Release coming soon
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground mt-3">
                {primaryMeta.ext}
                {primaryAsset ? ` · ${formatBytes(primaryAsset.size)}` : ""}
                {release?.published_at
                  ? ` · Released ${formatDate(release.published_at)}`
                  : ""}
              </p>
            </div>

            {/* API error warning */}
            {releaseError && (
              <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Could not fetch release info.{" "}
                <a
                  href="https://github.com/Zenvi-pro/zenvi-core/releases"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  View on GitHub
                </a>
              </p>
            )}
          </motion.div>

          {/* What's new */}
          {release?.body && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.22}
            >
              <div className="rounded-xl border border-white/[0.06] bg-[#0D0D0D] p-6 mb-4">
                <h2 className="text-sm font-semibold text-white mb-3">
                  What's new in {release.tag_name}
                </h2>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed line-clamp-6">
                  {release.body}
                </p>
              </div>
            </motion.div>
          )}

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
              {secondaryCards.map(({ meta, asset }, i) => {
                const cardContent = (
                  <div
                    className={`rounded-lg border border-white/[0.06] bg-[#0F0F0F] transition-all duration-200 p-4 flex items-center gap-3 group ${
                      asset
                        ? "hover:border-white/[0.12] hover:bg-[#141414] cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-md border border-white/[0.06] flex items-center justify-center text-muted-foreground group-hover:text-white transition-colors">
                      <meta.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {meta.ext}
                        {asset ? ` · ${formatBytes(asset.size)}` : " · Coming soon"}
                      </p>
                    </div>
                    {asset && (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                );

                return asset ? (
                  <a key={i} href={asset.browser_download_url}>
                    {cardContent}
                  </a>
                ) : (
                  <div key={i}>{cardContent}</div>
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
              href="mailto:support@zenvi.pro"
              className="text-primary hover:underline"
            >
              support@zenvi.pro
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
