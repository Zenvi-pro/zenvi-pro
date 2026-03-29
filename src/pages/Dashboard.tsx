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
  LogOut,
  CreditCard,
  ExternalLink,
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

// ── Helpers ────────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  none: "No Plan",
  creator: "Creator",
  pro: "Pro",
  studio: "Studio",
  lifetime: "Lifetime",
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-primary",
  anthropic: "bg-orange-500",
  runware: "bg-violet-500",
  google: "bg-green-500",
  ollama: "bg-zinc-500",
  "nvidia-edge": "bg-cyan-600",
};

const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  runware: "Runware",
  google: "Google",
  ollama: "Ollama (local)",
  "nvidia-edge": "NVIDIA Edge",
};

function fmt(usd: number) {
  return usd < 0.01 ? "<$0.01" : `$${usd.toFixed(2)}`;
}

function barColor(pct: number) {
  if (pct >= 90) return "bg-destructive";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-primary";
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (d = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: d },
  }),
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [billingLoading, setBillingLoading] = useState(false);

  // Auth + subscription guard
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate("/login?next=/dashboard"); return; }
      const { data: sub } = await supabase.rpc("get_user_subscription");
      if (!sub || sub.length === 0) { window.location.href = "/#pricing"; return; }
    });
  }, [navigate]);

  async function handleManageBilling() {
    setBillingLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login?next=/dashboard"); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-billing-portal`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard` }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (payload?.url) {
        window.location.href = payload.url;
      }
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  const pct = totals?.percentage_used ?? 0;
  const maxHistoryCost = Math.max(...history.map((h) => h.total_cost_usd), 0.01);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-white tracking-tight">
            Zenvi
          </Link>
          <div className="flex items-center gap-5">
            <Link
              to="/#pricing"
              className="text-xs text-muted-foreground hover:text-white transition-colors"
            >
              Upgrade
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        {totalsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Header */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mb-10"
            >
              <p className="text-xs text-muted-foreground mb-1">
                {new Date().toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Usage & Spending
              </h1>
            </motion.div>

            {/* ── Over-limit warning ─────────────────────────────────────── */}
            {pct >= 90 && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.05}
                className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4"
              >
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {pct >= 100
                      ? "Monthly limit reached"
                      : "Approaching monthly limit"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You've used {pct.toFixed(0)}% of your{" "}
                    {TIER_LABELS[totals?.tier ?? "none"]} plan budget. Upgrade
                    to keep using AI features.
                  </p>
                </div>
                <Link to="/#pricing">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white text-xs h-8 px-3 shrink-0"
                  >
                    Upgrade
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            )}

            {/* ── Top stat cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Spend card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.08}
                className="md:col-span-2 rounded-xl border border-white/[0.07] bg-[#111111] p-6"
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Spent this month
                    </p>
                    <p className="text-3xl font-bold text-white tabular-nums">
                      {fmt(totals?.total_cost_usd ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      of {fmt(totals?.monthly_limit_usd ?? 10)} limit ·{" "}
                      <span
                        className={
                          pct >= 90
                            ? "text-destructive"
                            : pct >= 70
                              ? "text-yellow-500"
                              : "text-primary"
                        }
                      >
                        {pct.toFixed(0)}%
                      </span>{" "}
                      used
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full border border-white/[0.08] text-muted-foreground font-medium">
                    {TIER_LABELS[totals?.tier ?? "none"]}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    className={`h-full rounded-full ${barColor(pct)}`}
                  />
                </div>
              </motion.div>

              {/* Requests card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.12}
                className="rounded-xl border border-white/[0.07] bg-[#111111] p-6 flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-lg border border-white/[0.07] flex items-center justify-center text-primary mb-4">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {(totals?.total_requests ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    AI requests this month
                  </p>
                </div>
              </motion.div>
            </div>

            {/* ── Provider breakdown ─────────────────────────────────────── */}
            {providers.length > 0 && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.16}
                className="rounded-xl border border-white/[0.07] bg-[#111111] p-6 mb-6"
              >
                <h2 className="text-sm font-semibold text-white mb-5">
                  By provider
                </h2>
                <div className="space-y-4">
                  {providers.map((p) => {
                    const share =
                      totals && totals.total_cost_usd > 0
                        ? (p.total_cost_usd / totals.total_cost_usd) * 100
                        : 0;
                    const color = PROVIDER_COLORS[p.provider] ?? "bg-zinc-500";
                    const label = PROVIDER_LABEL[p.provider] ?? p.provider;

                    return (
                      <div key={p.provider}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${color}`}
                            />
                            <span className="text-sm text-white font-medium">
                              {label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{p.request_count.toLocaleString()} req</span>
                            <span className="text-white font-medium tabular-nums">
                              {fmt(p.total_cost_usd)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.05]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${share}%` }}
                            transition={{
                              duration: 0.7,
                              ease: [0.22, 1, 0.36, 1],
                              delay: 0.4,
                            }}
                            className={`h-full rounded-full ${color}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── 6-month history chart ──────────────────────────────────── */}
            {history.length > 0 && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.2}
                className="rounded-xl border border-white/[0.07] bg-[#111111] p-6 mb-6"
              >
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-white">
                    Monthly history
                  </h2>
                </div>
                <div className="flex items-end gap-3 h-28">
                  {history.map((h, i) => {
                    const barH =
                      maxHistoryCost > 0
                        ? (h.total_cost_usd / maxHistoryCost) * 100
                        : 0;
                    const isCurrentMonth = i === history.length - 1;
                    return (
                      <div
                        key={h.month}
                        className="flex-1 flex flex-col items-center gap-1.5"
                      >
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {h.total_cost_usd > 0 ? fmt(h.total_cost_usd) : "—"}
                        </p>
                        <div className="w-full flex items-end h-16">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${barH}%` }}
                            transition={{
                              duration: 0.6,
                              ease: [0.22, 1, 0.36, 1],
                              delay: 0.3 + i * 0.05,
                            }}
                            className={`w-full rounded-t-sm ${
                              isCurrentMonth
                                ? "bg-primary"
                                : "bg-white/[0.08]"
                            }`}
                            style={{ minHeight: h.total_cost_usd > 0 ? 4 : 0 }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {h.month}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Subscription & billing ────────────────────────────────────── */}
            {totals && totals.tier !== "none" && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.22}
                className="rounded-xl border border-white/[0.07] bg-[#111111] p-6 mb-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current plan</p>
                    <p className="text-base font-semibold text-white">
                      Zenvi {TIER_LABELS[totals.tier]}
                    </p>
                    {totals.tier === "lifetime" ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Lifetime access · no renewal
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Active subscription
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleManageBilling}
                    disabled={billingLoading}
                    className="border-white/[0.1] text-white hover:bg-white/[0.05] text-xs h-8 gap-1.5"
                  >
                    {billingLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5" />
                    )}
                    Manage billing
                    {!billingLoading && <ExternalLink className="w-3 h-3 opacity-50" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Empty state ─────────────────────────────────────────────── */}
            {!totalsLoading && providers.length === 0 && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.16}
                className="rounded-xl border border-white/[0.06] bg-[#0D0D0D] p-10 text-center"
              >
                <p className="text-white font-medium mb-2">No usage yet</p>
                <p className="text-sm text-muted-foreground">
                  Start using the Zenvi app — AI usage will appear here.
                </p>
                <Link to="/download" className="inline-block mt-5">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Download Zenvi
                  </Button>
                </Link>
              </motion.div>
            )}

            {/* ── Upgrade nudge (70–89%) ─────────────────────────────────── */}
            {pct >= 70 && pct < 90 && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.24}
                className="mt-4 flex items-center justify-between rounded-xl border border-primary/15 bg-primary/5 px-5 py-4"
              >
                <p className="text-sm text-white">
                  At <span className="font-semibold">{pct.toFixed(0)}%</span>{" "}
                  of your monthly limit — consider upgrading.
                </p>
                <Link to="/#pricing">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10 text-xs h-8"
                  >
                    View plans
                  </Button>
                </Link>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
