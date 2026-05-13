import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertTriangle,
  TrendingUp,
  Zap,
  ArrowUpRight,
  CreditCard,
  ExternalLink,
  Check,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MonthlyTotals {
  total_cost_usd: number;
  total_requests: number;
  monthly_limit_usd: number;
  percentage_used: number;
  tier: string;
}

interface ProviderRow {
  provider: string;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  request_count: number;
}

interface HistoryRow {
  month: string;
  total_cost_usd: number;
  request_count: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  none: "No Plan",
  creator: "Creator",
  pro: "Pro",
  studio: "Studio",
  lifetime: "Lifetime",
};

const TIER_ORDER: Record<string, number> = {
  none: 0,
  creator: 1,
  pro: 2,
  studio: 3,
  lifetime: 4,
};

const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  runware: "Runware",
  google: "Google",
  ollama: "Ollama (local)",
  "nvidia-edge": "NVIDIA Edge",
};

// Provider bar color — restrained, tinted toward brand
const PROVIDER_HEX: Record<string, string> = {
  openai: "#3275F8",
  anthropic: "#C4926A",
  runware: "#A78BFA",
  google: "#5FBF8F",
  ollama: "#9CA3AF",
  "nvidia-edge": "#67E8F9",
};

function fmt(usd: number) {
  return usd < 0.01 ? "<$0.01" : `$${usd.toFixed(2)}`;
}

function barTint(pct: number) {
  if (pct >= 90) return "from-rose-500 to-rose-400";
  if (pct >= 70) return "from-amber-500 to-amber-400";
  return "from-[#3275F8] to-[#67A4FF]";
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (d = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: d },
  }),
};

// Shared "glass" surface classes — sparingly used so they keep their meaning
const glass =
  "rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.045] via-white/[0.018] to-white/[0.005] backdrop-blur-xl";

// ── Component ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [billingLoading, setBillingLoading] = useState(false);

  // Auth + subscription guard
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/login?next=/dashboard/usage");
        return;
      }
      const { data: sub } = await supabase.rpc("get_user_subscription");
      if (!sub || sub.length === 0) {
        window.location.href = "/#pricing";
      }
    });
  }, [navigate]);

  async function handleManageBilling() {
    setBillingLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login?next=/dashboard/usage");
        return;
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-billing-portal`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard/usage` }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (payload?.url) window.location.href = payload.url;
    } finally {
      setBillingLoading(false);
    }
  }

  const { data: totals, isLoading: totalsLoading } = useQuery<MonthlyTotals>({
    queryKey: ["monthly-totals"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monthly_totals");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total_cost_usd: Number(row?.total_cost_usd ?? 0),
        total_requests: Number(row?.total_requests ?? 0),
        monthly_limit_usd: Number(row?.monthly_limit_usd ?? 10),
        percentage_used: Number(row?.percentage_used ?? 0),
        tier: row?.tier ?? "none",
      };
    },
  });

  const { data: providers = [] } = useQuery<ProviderRow[]>({
    queryKey: ["usage-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_usage_summary");
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        provider: String(r.provider ?? ""),
        total_cost_usd: Number(r.total_cost_usd ?? 0),
        total_input_tokens: Number(r.total_input_tokens ?? 0),
        total_output_tokens: Number(r.total_output_tokens ?? 0),
        request_count: Number(r.request_count ?? 0),
      }));
    },
  });

  const { data: history = [] } = useQuery<HistoryRow[]>({
    queryKey: ["usage-history"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_usage_history", {
        months_back: 6,
      });
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        month: String(r.month ?? ""),
        total_cost_usd: Number(r.total_cost_usd ?? 0),
        request_count: Number(r.request_count ?? 0),
      }));
    },
  });

  const pct = totals?.percentage_used ?? 0;
  const maxHistoryCost = Math.max(...history.map((h) => h.total_cost_usd), 0.01);

  // Derived: avg cost per day this month
  const now = new Date();
  const dayOfMonth = now.getDate();
  const avgPerDay = totals && dayOfMonth > 0 ? totals.total_cost_usd / dayOfMonth : 0;

  if (totalsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient brand-blue glow at the top — Flora touch */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_60%_42%_at_50%_-6%,rgba(50,117,248,0.16),transparent_70%)]"
      />

      <main className="relative mx-auto w-full max-w-5xl px-6 py-14 lg:px-10">
        {/* ───────── Header ───────── */}
        <motion.header variants={fadeUp} initial="hidden" animate="visible">
          <p className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary">
            <span
              aria-hidden
              className="h-1 w-1 rounded-full bg-primary shadow-[0_0_10px_2px_rgba(50,117,248,0.6)]"
            />
            {now.toLocaleString("en-US", { month: "long", year: "numeric" })}
          </p>
          <h1 className="mt-4 text-balance font-serif text-[40px] font-normal leading-[1.04] tracking-[-0.015em] text-white md:text-[52px]">
            Usage. <em className="italic text-white/95">This month.</em>
          </h1>
        </motion.header>

        {/* ───────── Over-limit warning ───────── */}
        {pct >= 90 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.04}
            className="mt-8 flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-5 py-4"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {pct >= 100 ? "Monthly limit reached" : "Approaching monthly limit"}
              </p>
              <p className="mt-0.5 text-xs text-white/55">
                You&apos;ve used {pct.toFixed(0)}% of your{" "}
                {TIER_LABELS[totals?.tier ?? "none"]} plan budget. Upgrade to keep using AI features.
              </p>
            </div>
            <Link to="/#pricing">
              <Button
                size="sm"
                className="h-8 shrink-0 gap-1 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
              >
                Upgrade
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </motion.div>
        )}

        {/* ───────── Hero card: spend + plan ───────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.08}
          className={`relative mt-10 overflow-hidden p-7 md:p-9 ${glass}`}
        >
          {/* Subtle dot grid backdrop — Cursor-inspired but blue */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:radial-gradient(rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:14px_14px]"
          />
          {/* Edge highlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />

          <div className="relative grid gap-10 md:grid-cols-[1.5fr_1fr] md:items-center">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                Spent this month
              </p>
              <p className="mt-2 font-serif text-[56px] font-normal leading-none tracking-[-0.02em] tabular-nums text-white md:text-[72px]">
                {fmt(totals?.total_cost_usd ?? 0)}
              </p>
              <p className="mt-3 text-[13px] text-white/55">
                of <span className="text-white/85">{fmt(totals?.monthly_limit_usd ?? 10)}</span>{" "}
                limit
              </p>

              {/* Progress bar — single tinted track, gradient fill */}
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
                  className={`h-full rounded-full bg-gradient-to-r ${barTint(pct)} shadow-[0_0_18px_rgba(50,117,248,0.5)]`}
                />
              </div>
              <p className="mt-2.5 text-[11.5px] tabular-nums text-white/45">
                {pct.toFixed(1)}% used
              </p>
            </div>

            {/* Plan badge column */}
            <div className="flex flex-col items-start gap-3 border-t border-white/[0.07] pt-7 md:items-end md:border-l md:border-t-0 md:pl-10 md:pt-0 md:text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                Current plan
              </p>
              <p className="font-serif text-[26px] leading-tight text-white">
                Zenvi {TIER_LABELS[totals?.tier ?? "none"]}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-primary">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(50,117,248,0.7)]" />
                Active
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleManageBilling}
                disabled={billingLoading}
                className="mt-2 h-8 gap-1.5 border-white/[0.1] bg-transparent text-xs text-white hover:bg-white/[0.05]"
              >
                {billingLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5" />
                )}
                Manage billing
                {!billingLoading && <ExternalLink className="h-3 w-3 opacity-50" />}
              </Button>
            </div>
          </div>
        </motion.section>

        {/* ───────── Quick stats row ───────── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.12}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          <StatTile
            icon={Zap}
            label="AI requests"
            value={(totals?.total_requests ?? 0).toLocaleString()}
            sub="this month"
          />
          <StatTile
            icon={Calendar}
            label="Days active"
            value={String(dayOfMonth)}
            sub={`of ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()} days`}
          />
          <StatTile
            icon={TrendingUp}
            label="Average / day"
            value={fmt(avgPerDay)}
            sub="rolling"
          />
        </motion.div>

        {/* ───────── Where it went (provider breakdown) ───────── */}
        {providers.length > 0 && (
          <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.16}
            className="mt-10"
          >
            <SectionHeader title="Where it went" caption="By provider" />
            <div className={`mt-5 p-6 md:p-7 ${glass}`}>
              <div className="space-y-5">
                {providers
                  .slice()
                  .sort((a, b) => b.total_cost_usd - a.total_cost_usd)
                  .map((p) => {
                    const share =
                      totals && totals.total_cost_usd > 0
                        ? (p.total_cost_usd / totals.total_cost_usd) * 100
                        : 0;
                    const color = PROVIDER_HEX[p.provider] ?? "#9CA3AF";
                    const label = PROVIDER_LABEL[p.provider] ?? p.provider;
                    return (
                      <div key={p.provider}>
                        <div className="mb-2 flex items-baseline justify-between gap-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: color,
                                boxShadow: `0 0 10px ${color}80`,
                              }}
                              aria-hidden
                            />
                            <span className="text-[13.5px] font-medium text-white">
                              {label}
                            </span>
                            <span className="text-[11px] tabular-nums text-white/35">
                              {p.request_count.toLocaleString()} req
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-[13.5px] font-medium tabular-nums text-white">
                              {fmt(p.total_cost_usd)}
                            </span>
                            <span className="text-[11px] tabular-nums text-white/35">
                              {share.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.05]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${share}%` }}
                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
                            className="h-full rounded-full"
                            style={{
                              background: `linear-gradient(90deg, ${color}, ${color}99)`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </motion.section>
        )}

        {/* ───────── 6-month history ───────── */}
        {history.length > 0 && (
          <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className="mt-10"
          >
            <SectionHeader title="Activity" caption="Last 6 months" />
            <div className={`mt-5 p-6 md:p-7 ${glass}`}>
              <div className="flex h-32 items-end gap-3">
                {history.map((h, i) => {
                  const barH = maxHistoryCost > 0 ? (h.total_cost_usd / maxHistoryCost) * 100 : 0;
                  const isCurrent = i === history.length - 1;
                  return (
                    <div
                      key={h.month}
                      className="group flex flex-1 flex-col items-center gap-2"
                    >
                      <p className="text-[10px] tabular-nums text-white/30 transition-colors group-hover:text-white/70">
                        {h.total_cost_usd > 0 ? fmt(h.total_cost_usd) : "—"}
                      </p>
                      <div className="flex h-20 w-full items-end">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${barH}%` }}
                          transition={{
                            duration: 0.6,
                            ease: [0.16, 1, 0.3, 1],
                            delay: 0.35 + i * 0.05,
                          }}
                          className={`w-full rounded-t-sm ${
                            isCurrent
                              ? "bg-gradient-to-t from-primary to-[#67A4FF] shadow-[0_0_18px_rgba(50,117,248,0.5)]"
                              : "bg-white/[0.08] group-hover:bg-white/[0.14]"
                          }`}
                          style={{ minHeight: h.total_cost_usd > 0 ? 4 : 0 }}
                        />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">
                        {h.month}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}

        {/* ───────── Plans (current + upgrade options) ───────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.24}
          className="mt-10"
        >
          <SectionHeader
            title="Plans"
            caption="Upgrade or switch"
            action={
              <Link
                to="/pricing"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-white/55 transition-colors hover:text-white"
              >
                Compare all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <PlanTile
              tier="creator"
              currentTier={totals?.tier ?? "none"}
              name="Creator"
              price="$29"
              cadence="/mo"
              tagline="For indie creators"
              bullets={["1,500 credits/mo", "1080p export", "60 min indexing"]}
            />
            <PlanTile
              tier="pro"
              currentTier={totals?.tier ?? "none"}
              name="Pro"
              price="$99"
              cadence="/mo"
              tagline="For freelancers"
              bullets={["5,000 credits/mo", "4K export", "Priority queue"]}
              accent
            />
            <PlanTile
              tier="studio"
              currentTier={totals?.tier ?? "none"}
              name="Studio"
              price="$199"
              cadence="/mo"
              tagline="For teams"
              bullets={["12,000 shared credits", "3 seats", "API access"]}
            />
          </div>
        </motion.section>

        {/* ───────── Upgrade nudge ───────── */}
        {pct >= 70 && pct < 90 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.28}
            className="mt-6 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/[0.04] px-5 py-4"
          >
            <p className="text-sm text-white">
              At <span className="font-semibold">{pct.toFixed(0)}%</span> of your monthly limit — consider upgrading.
            </p>
            <Link to="/pricing">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-primary/30 text-xs text-primary hover:bg-primary/10"
              >
                View plans
              </Button>
            </Link>
          </motion.div>
        )}

        {/* ───────── Empty state ───────── */}
        {providers.length === 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.16}
            className={`mt-10 flex flex-col items-center px-10 py-14 text-center ${glass}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03]">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-5 font-serif text-[24px] text-white">No usage yet.</p>
            <p className="mt-2 max-w-xs text-[13.5px] text-white/55">
              Start using the Zenvi app — AI usage will appear here.
            </p>
            <Link to="/dashboard/download" className="mt-6">
              <Button className="h-9 gap-1.5 rounded-full bg-white px-5 text-[13px] font-semibold text-black hover:bg-white/90">
                Download Zenvi
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-serif text-[22px] leading-tight tracking-tight text-white md:text-[24px]">
          {title}
        </h2>
        {caption && (
          <p className="mt-1 text-[11.5px] uppercase tracking-[0.16em] text-white/40">
            {caption}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className={`flex items-center gap-4 p-5 ${glass}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/40">
          {label}
        </p>
        <p className="mt-0.5 text-[22px] font-medium tabular-nums leading-tight text-white">
          {value}
        </p>
        {sub && <p className="text-[11px] text-white/40">{sub}</p>}
      </div>
    </div>
  );
}

function PlanTile({
  tier,
  currentTier,
  name,
  price,
  cadence,
  tagline,
  bullets,
  accent,
}: {
  tier: string;
  currentTier: string;
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  bullets: string[];
  accent?: boolean;
}) {
  const currentOrder = TIER_ORDER[currentTier] ?? 0;
  const tileOrder = TIER_ORDER[tier] ?? 0;
  const isCurrent = currentOrder === tileOrder;
  const isLower = currentOrder > tileOrder;
  const isUpgrade = !isCurrent && !isLower;

  return (
    <div
      className={`relative flex flex-col gap-4 p-5 transition-colors ${
        isCurrent
          ? "rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/[0.06] via-white/[0.02] to-white/[0.005]"
          : accent
            ? "rounded-2xl border border-white/[0.09] bg-gradient-to-br from-white/[0.05] via-white/[0.018] to-white/[0.005] hover:border-white/[0.14]"
            : `${glass} hover:border-white/[0.12]`
      }`}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-serif text-[20px] leading-tight text-white">{name}</p>
          <p className="mt-0.5 text-[11.5px] text-white/45">{tagline}</p>
        </div>
        {isCurrent && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-primary">
            <span aria-hidden className="h-1 w-1 rounded-full bg-primary shadow-[0_0_6px_rgba(50,117,248,0.7)]" />
            Current
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-[26px] font-medium tabular-nums text-white">{price}</span>
        <span className="text-[12px] text-white/45">{cadence}</span>
      </div>

      <ul className="space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] text-white/65">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" aria-hidden />
            {b}
          </li>
        ))}
      </ul>

      <div className="pt-1">
        {isCurrent ? (
          <Link
            to="/pricing"
            className="inline-flex h-8 w-full items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] text-[12px] font-medium text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Manage plan
          </Link>
        ) : isUpgrade ? (
          <Link
            to={`/checkout?plan=${tier}_monthly&mode=upgrade`}
            className="group inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-white text-[12px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            Upgrade to {name}
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <span className="inline-flex h-8 w-full items-center justify-center rounded-full border border-white/[0.05] text-[11.5px] text-white/35">
            Included
          </span>
        )}
      </div>
    </div>
  );
}
