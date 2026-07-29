import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  CheckCircle,
  ArrowLeft,
  Loader2,
  XCircle,
  ChevronRight,
  AlertCircle,
  Sparkles,
  KeyRound,
  X,
  Calendar,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

// ───────── GitHub release types ─────────

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
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

// ───────── Helpers ─────────

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

// ───────── Inline platform icons ─────────

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

// ───────── Platform meta ─────────

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

const DEB_META = {
  label: "Linux (Debian)",
  sublabel: "Ubuntu 20.04+ / Debian-based",
  icon: LinuxIcon,
  ext: ".deb",
};

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (ua.includes("Mac OS X") || ua.includes("Macintosh")) return "mac";
  if (ua.includes("Windows")) return "windows";
  return "linux";
}

// ───────── Local motion + glass kit ─────────

type TokenState = "loading" | "valid" | "invalid" | "no-plan";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay },
  }),
};

const glass =
  "rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.045] via-white/[0.018] to-white/[0.005] backdrop-blur-xl";

// ───────── Main component ─────────

export default function DownloadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [tokenState, setTokenState] = useState<TokenState>("loading");
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>("mac");
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Modal and pending download states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [modalError, setModalError] = useState("");
  const [isIncorrectCode, setIsIncorrectCode] = useState(false);

  useEffect(() => {
    setDetectedPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setTokenState("invalid");
          return;
        }

        // Check if user has an active subscription
        const { data: sub } = await supabase.rpc("get_user_subscription");
        const hasSub = sub && sub.length > 0;

        // Check if user has claimed a waitlist token
        const { data: hasAccessRpc } = await supabase.rpc("get_user_download_access");
        const userHasAccess = hasSub || !!hasAccessRpc;

        setHasAccess(userHasAccess);
        setTokenState("valid");
      } catch {
        setTokenState("invalid");
      }
    })();
  }, [token]);

  const { data: release, isError: releaseError } = useQuery<GithubRelease | null>({
    queryKey: ["zenvi-latest-release"],
    queryFn: fetchLatestRelease,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleDownloadClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    if (!hasAccess) {
      e.preventDefault();
      setPendingDownloadUrl(url);
      setIsModalOpen(true);
    } else {
      setDownloadStarted(true);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (tokenState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // ── Invalid token ────────────────────────────────────────────────────────
  if (tokenState === "invalid") {
    return <StateScreen kind="invalid" />;
  }

  // ── Valid ────────────────────────────────────────────────────────────────
  const primaryMeta = PLATFORM_META[detectedPlatform];
  const others = (Object.keys(PLATFORM_META) as Platform[]).filter(
    (p) => p !== detectedPlatform,
  );
  const getAsset = (ext: string): GithubAsset | null =>
    release?.assets ? (findAsset(release.assets, ext) ?? null) : null;
  const primaryAsset = getAsset(primaryMeta.ext);

  const secondaryCards = others.map((p) => ({
    meta: PLATFORM_META[p],
    asset: getAsset(PLATFORM_META[p].ext),
  }));
  if (detectedPlatform === "linux") {
    secondaryCards.push({ meta: DEB_META, asset: getAsset(".deb") });
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = accessCode.trim();
    if (!trimmed) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmed)) {
      setModalError("Reach out to the founders for early access or questions.");
      setIsIncorrectCode(true);
      return;
    }

    setIsSubmittingCode(true);
    setModalError("");
    setIsIncorrectCode(false);

    try {
      const { data: success, error: rpcError } = await supabase.rpc("claim_waitlist_token", {
        token: trimmed,
      });

      if (rpcError || !success) {
        setModalError("Reach out to the founders for early access or questions.");
        setIsIncorrectCode(true);
        return;
      }

      setHasAccess(true);
      setIsModalOpen(false);
      setAccessCode("");

      const downloadUrl = pendingDownloadUrl || primaryAsset?.browser_download_url;
      if (downloadUrl) {
        setDownloadStarted(true);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.click();
      }
    } catch {
      setModalError("Reach out to the founders for early access or questions.");
      setIsIncorrectCode(true);
    } finally {
      setIsSubmittingCode(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient blue glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(ellipse_60%_44%_at_50%_-6%,rgba(50,117,248,0.18),transparent_70%)]"
      />

      <main className="relative mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-14 lg:px-10">
        {/* ───────── Header ───────── */}
        <motion.header variants={fadeUp} initial="hidden" animate="visible">
          <p className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary">
            <CheckCircle className="h-3 w-3" />
            Early access · confirmed
          </p>
          <h1 className="mt-3 sm:mt-4 text-balance font-serif text-[32px] sm:text-[44px] font-normal leading-[1.04] tracking-[-0.015em] text-white md:text-[60px]">
            You&apos;re in. <em className="italic text-white/95">Welcome.</em>
          </h1>
          <p className="mt-3 sm:mt-4 max-w-md text-[14px] sm:text-[14.5px] leading-relaxed text-white/55">
            Download Zenvi for{" "}
            <span className="text-white">{primaryMeta.label}</span> and start editing
            with AI — locally, on your hardware.
          </p>
        </motion.header>

        {/* ───────── Primary download ───────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.08}
          className={`relative mt-8 sm:mt-10 overflow-hidden p-5 sm:p-7 md:p-8 ${glass}`}
        >
          {/* Top edge highlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />
          {/* Subtle dot pattern */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:14px_14px]"
          />

          <div className="relative">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white">
                  <primaryMeta.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-[18px] sm:text-[22px] leading-tight text-white">
                    Zenvi for {primaryMeta.label}
                  </p>
                  <p className="mt-1 text-[12px] sm:text-[12.5px] text-white/50">{primaryMeta.sublabel}</p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-wider text-primary tabular-nums">
                {release?.tag_name ?? "Beta"}
              </span>
            </div>

            <div className="mt-7">
              {primaryAsset ? (
                <a
                  href={primaryAsset.browser_download_url}
                  onClick={(e) => handleDownloadClick(e, primaryAsset.browser_download_url)}
                >
                  <Button className="group h-12 w-full gap-2 rounded-full bg-primary text-[14px] font-semibold text-primary-foreground shadow-[0_12px_36px_-10px_rgba(50,117,248,0.6)] transition-all hover:bg-primary/90 active:scale-[0.99]">
                    {downloadStarted ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Download started
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                        Download for {primaryMeta.label}
                      </>
                    )}
                  </Button>
                </a>
              ) : (
                <Button disabled className="h-12 w-full gap-2 rounded-full opacity-50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Release coming soon
                </Button>
              )}

              <p className="mt-3 text-center text-[11.5px] tabular-nums text-white/40">
                {primaryMeta.ext}
                {primaryAsset ? ` · ${formatBytes(primaryAsset.size)}` : ""}
                {release?.published_at ? ` · Released ${formatDate(release.published_at)}` : ""}
              </p>
            </div>
          </div>
        </motion.section>

        {releaseError && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11.5px] text-white/40">
            <AlertCircle className="h-3 w-3" />
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

        {/* ───────── Other platforms ───────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.14}
          className="mt-10"
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Other platforms
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {secondaryCards.map(({ meta, asset }, i) => {
              const card = (
                <div
                  className={`group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 transition-all duration-300 ${
                    asset
                      ? "hover:-translate-y-0.5 hover:border-white/[0.15] hover:bg-white/[0.04]"
                      : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.07] text-white/55 transition-colors group-hover:border-primary/40 group-hover:text-primary">
                    <meta.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-white">{meta.label}</p>
                    <p className="text-[11px] tabular-nums text-white/40">
                      {meta.ext}
                      {asset ? ` · ${formatBytes(asset.size)}` : " · coming soon"}
                    </p>
                  </div>
                  {asset && (
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-white/25 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden
                    />
                  )}
                </div>
              );

              return asset ? (
                <a
                  key={i}
                  href={asset.browser_download_url}
                  onClick={(e) => handleDownloadClick(e, asset.browser_download_url)}
                >
                  {card}
                </a>
              ) : (
                <div key={i}>{card}</div>
              );
            })}
          </div>
        </motion.section>

        {/* ───────── What's new ───────── */}
        {release?.body && (
          <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.18}
            className="mt-10"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="font-serif text-[22px] leading-tight tracking-tight text-white md:text-[24px]">
                  What&apos;s new
                </h2>
                <p className="mt-1 text-[11.5px] uppercase tracking-[0.16em] text-white/40">
                  {release.tag_name}
                </p>
              </div>
              <a
                href={`https://github.com/Zenvi-pro/zenvi-core/releases/tag/${release.tag_name}`}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-medium text-white/55 transition-colors hover:text-white"
              >
                Full notes ↗
              </a>
            </div>
            <div className={`mt-5 p-4 sm:p-6 ${glass}`}>
              <ReleaseNotesMarkdown content={release.body} />
            </div>
          </motion.section>
        )}

        {/* ───────── Next steps ───────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.22}
          className="mt-10"
        >
          <h2 className="font-serif text-[22px] leading-tight tracking-tight text-white md:text-[24px]">
            What&apos;s next
          </h2>
          <p className="mt-1 text-[11.5px] uppercase tracking-[0.16em] text-white/40">
            Three steps
          </p>
          <ol className="mt-5 space-y-2.5">
            {NEXT_STEPS.map((step, i) => (
              <li
                key={i}
                className={`flex items-start gap-4 p-5 ${glass}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-[11px] font-semibold tabular-nums text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-white">{step.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/55">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* ───────── Tail link ───────── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.26}
          className="mt-8 sm:mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4 border-t border-white/[0.06] pt-6 sm:pt-8 text-[12.5px] text-white/45"
        >
          <Link to="/dashboard/usage" className="hover:text-white transition-colors">
            Check your usage
          </Link>
          <span aria-hidden className="hidden text-white/15 sm:inline">·</span>
          <Link to="/docs" className="hover:text-white transition-colors">
            Read the docs
          </Link>
          <span aria-hidden className="hidden text-white/15 sm:inline">·</span>
          <a
            href="https://github.com/Zenvi-pro/zenvi-core"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
        </motion.div>
      </main>

      {/* Access Code Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setModalError("");
                setIsIncorrectCode(false);
                setAccessCode("");
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />

            <div className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md pointer-events-auto"
              >
                <div className="relative rounded-2xl border border-white/[0.07] bg-[#0c0c16]/95 bg-gradient-to-br from-white/[0.045] via-white/[0.018] to-white/[0.005] backdrop-blur-xl p-5 sm:p-8 shadow-2xl">
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setModalError("");
                      setIsIncorrectCode(false);
                      setAccessCode("");
                    }}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/50 hover:text-white" />
                  </button>

                  <div className="w-11 h-11 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-center mb-5">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>

                  <h2 className="text-xl font-serif font-normal text-white mb-2">
                    Zenvi is Waitlist Only
                  </h2>
                  <p className="text-[13.5px] leading-relaxed text-white/60 mb-6">
                    Right now Zenvi is waitlisted only, please enter an access code to enter.
                  </p>

                  <form onSubmit={handleCodeSubmit} className="space-y-4">
                    <Input
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={accessCode}
                      onChange={(e) => {
                        setAccessCode(e.target.value);
                        setModalError("");
                        setIsIncorrectCode(false);
                      }}
                      required
                      autoFocus
                      className="h-11 bg-white/[0.03] border-white/[0.07] focus:border-primary text-white placeholder:text-white/30 font-mono text-sm"
                    />

                    {modalError && (
                      <div className="space-y-3">
                        <p className="text-sm text-rose-400 font-medium leading-relaxed">
                          {modalError}
                        </p>
                        {isIncorrectCode && (
                          <button
                            type="button"
                            onClick={() => {
                              window.open(
                                "https://calendly.com/nilay800/zenvi",
                                "Calendly",
                                "width=800,height=600,status=no,toolbar=no,menubar=no,location=no"
                              );
                            }}
                            className="inline-flex items-center justify-center gap-2 h-10 w-full rounded-xl border border-primary/35 bg-primary/10 px-4 text-xs font-semibold text-white hover:bg-primary/20 hover:border-primary/55 transition-all shadow-[0_0_15px_rgba(50,117,248,0.2)]"
                          >
                            <Calendar className="w-3.5 h-3.5 text-[#3275F8]" />
                            Book a Call on Calendly
                          </button>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmittingCode || !accessCode.trim()}
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium shadow-[0_12px_36px_-10px_rgba(50,117,248,0.6)] active:scale-[0.99] transition-all"
                    >
                      {isSubmittingCode ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Validate & Download"
                      )}
                    </Button>
                  </form>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────── Empty-ish state screens (no-plan / invalid) ─────────

function StateScreen({ kind }: { kind: "no-plan" | "invalid" }) {
  const config = {
    "no-plan": {
      icon: Sparkles,
      iconTone: "text-primary",
      title: "No active plan.",
      body: "You need an active Zenvi subscription to download the app.",
      ctaLabel: "View plans",
      ctaHref: "/#pricing",
    },
    invalid: {
      icon: XCircle,
      iconTone: "text-rose-400",
      title: "Invalid access link.",
      body: "This link doesn't look right, or may have expired. Check your invite email or join the waitlist to get early access.",
      ctaLabel: "Back to Zenvi",
      ctaHref: "/",
    },
  }[kind];

  const Icon = config.icon;

  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_60%_42%_at_50%_-6%,rgba(50,117,248,0.14),transparent_70%)]"
      />
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`max-w-md ${glass} px-10 py-12`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025]">
            <Icon className={`h-6 w-6 ${config.iconTone}`} aria-hidden />
          </div>
          <h1 className="mt-6 font-serif text-[30px] leading-tight text-white">
            {config.title}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/55">{config.body}</p>
          <Link to={config.ctaHref} className="mt-8 inline-block">
            <Button
              className={
                kind === "no-plan"
                  ? "h-10 gap-1.5 rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
                  : "h-10 gap-1.5 rounded-full border border-white/[0.1] bg-transparent px-5 text-[13px] text-white hover:bg-white/[0.05]"
              }
              variant={kind === "no-plan" ? "default" : "outline"}
            >
              {kind === "invalid" && <ArrowLeft className="h-3.5 w-3.5" />}
              {config.ctaLabel}
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

// ───────── Release notes markdown ─────────

// Compact markdown renderer for GitHub release bodies, tuned to the glass
// card in "What's new". Handles headings, bold, links, lists and GFM tables.
function ReleaseNotesMarkdown({ content }: { content: string }) {
  return (
    <div className="text-[13px] leading-[1.7] text-white/65">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h3
              className="mb-2 mt-6 text-[14px] font-semibold text-white first:mt-0"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h3
              className="mb-2 mt-6 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-white/45 first:mt-0"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h4 className="mb-1.5 mt-5 text-[13px] font-semibold text-white/90" {...props} />
          ),
          p: ({ node, ...props }) => <p className="my-2.5" {...props} />,
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-white/90" {...props} />
          ),
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          a: ({ node, ...props }) => (
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul
              className="my-2.5 list-disc space-y-1.5 pl-5 marker:text-white/30"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="my-2.5 list-decimal space-y-1.5 pl-5 marker:text-white/30"
              {...props}
            />
          ),
          li: ({ node, ...props }) => <li className="pl-1 leading-[1.6]" {...props} />,
          hr: () => <hr className="my-5 border-white/[0.08]" />,
          code: ({ node, ...props }) => (
            <code
              className="rounded-md border border-white/[0.06] bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.82em] text-[#7DA8FF]"
              {...props}
            />
          ),
          pre: ({ node, ...props }) => (
            <pre
              className="my-3 overflow-x-auto rounded-lg border border-white/[0.08] bg-black/40 p-3.5 text-[12px] leading-relaxed text-white/80 [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-white/80"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-white/[0.08]">
              <table className="w-full text-left text-[12.5px] text-white/75" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              className="bg-white/[0.05] text-[11px] uppercase tracking-wide text-white"
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th className="border-b border-white/[0.08] px-3.5 py-2.5 font-semibold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border-b border-white/[0.06] px-3.5 py-2.5" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ───────── Static copy ─────────

const NEXT_STEPS = [
  {
    title: "Install Zenvi",
    description:
      "Open the downloaded file and follow the installer. On macOS, drag Zenvi to your Applications folder.",
  },
  {
    title: "Launch and explore",
    description:
      "Start a new project or import existing footage. The AI chat panel is on the right — describe what you want to create.",
  },
  {
    title: "Connect your AI models",
    description:
      "Open Preferences → AI to add your OpenAI or Anthropic API key. Zenvi uses your own keys so your data stays yours.",
  },
];
