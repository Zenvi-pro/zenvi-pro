/**
 * Admin billing dashboard.
 *
 * Internal-only page surfacing ops metrics:
 *   • Top-line user / MRR / margin numbers via get_admin_summary
 *   • Top spenders this month via get_admin_top_spenders
 *   • Spend anomalies via get_admin_anomalies (manual rerun via button)
 *
 * Gated entirely server-side: every RPC checks public.is_admin() first and
 * returns empty for non-admins. The email check in this component is just
 * UX so non-admins don't see a confusing empty page — the real security
 * gate lives in the DB.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle, RefreshCw, TrendingUp, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface AdminSummary {
  total_paid_users: number;
  free_users: number;
  starter_count: number;
  pro_count: number;
  max_count: number;
  lifetime_count: number;
  legacy_count: number;
  est_mrr_usd: number;
  est_arr_usd: number;
  month_total_cost_usd: number;
  month_credits_used: number;
  month_request_count: number;
  est_gross_profit_usd: number;
  est_gross_margin_pct: number;
  anomalies_this_week: number;
  standard_mode_users: number;
  overage_enabled_users: number;
}

interface TopSpender {
  user_id: string;
  email: string;
  tier: string;
  credits_used: number;
  cost_usd: number;
  request_count: number;
  in_standard_mode: boolean;
  overage_enabled: boolean;
}

interface AnomalyRow {
  id: string;
  detected_at: string;
  user_id: string;
  email: string;
  spend_today_credits: number;
  baseline_avg_credits: number;
  multiplier: number;
  action_taken: string | null;
  resolved_at: string | null;
  note: string | null;
}

function usd(n: number | null | undefined) {
  if (n == null) return "$0.00";
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

export default function AdminBillingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdminUI, setIsAdminUI] = useState(false);

  // ── Client-side admin gate (UX only — DB enforces the real check) ──
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/login?next=/admin/billing");
        return;
      }
      const { data, error } = await supabase.rpc("is_admin");
      setIsAdminUI(Boolean(data) && !error);
      setAuthChecked(true);
    });
  }, [navigate]);

  const summary = useQuery<AdminSummary | null>({
    queryKey: ["admin-summary"],
    enabled: isAdminUI,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_summary");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        total_paid_users: Number(row.total_paid_users ?? 0),
        free_users: Number(row.free_users ?? 0),
        starter_count: Number(row.starter_count ?? 0),
        pro_count: Number(row.pro_count ?? 0),
        max_count: Number(row.max_count ?? 0),
        lifetime_count: Number(row.lifetime_count ?? 0),
        legacy_count: Number(row.legacy_count ?? 0),
        est_mrr_usd: Number(row.est_mrr_usd ?? 0),
        est_arr_usd: Number(row.est_arr_usd ?? 0),
        month_total_cost_usd: Number(row.month_total_cost_usd ?? 0),
        month_credits_used: Number(row.month_credits_used ?? 0),
        month_request_count: Number(row.month_request_count ?? 0),
        est_gross_profit_usd: Number(row.est_gross_profit_usd ?? 0),
        est_gross_margin_pct: Number(row.est_gross_margin_pct ?? 0),
        anomalies_this_week: Number(row.anomalies_this_week ?? 0),
        standard_mode_users: Number(row.standard_mode_users ?? 0),
        overage_enabled_users: Number(row.overage_enabled_users ?? 0),
      };
    },
  });

  const topSpenders = useQuery<TopSpender[]>({
    queryKey: ["admin-top-spenders"],
    enabled: isAdminUI,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_top_spenders", { p_limit: 25 });
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        user_id: String(r.user_id ?? ""),
        email: String(r.email ?? ""),
        tier: String(r.tier ?? "free"),
        credits_used: Number(r.credits_used ?? 0),
        cost_usd: Number(r.cost_usd ?? 0),
        request_count: Number(r.request_count ?? 0),
        in_standard_mode: Boolean(r.in_standard_mode),
        overage_enabled: Boolean(r.overage_enabled),
      }));
    },
  });

  const anomalies = useQuery<AnomalyRow[]>({
    queryKey: ["admin-anomalies"],
    enabled: isAdminUI,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_anomalies", { p_limit: 50 });
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ""),
        detected_at: String(r.detected_at ?? ""),
        user_id: String(r.user_id ?? ""),
        email: String(r.email ?? ""),
        spend_today_credits: Number(r.spend_today_credits ?? 0),
        baseline_avg_credits: Number(r.baseline_avg_credits ?? 0),
        multiplier: Number(r.multiplier ?? 0),
        action_taken: r.action_taken ? String(r.action_taken) : null,
        resolved_at: r.resolved_at ? String(r.resolved_at) : null,
        note: r.note ? String(r.note) : null,
      }));
    },
  });

  const runDetector = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("detect_spend_anomalies");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-anomalies"] });
      queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    },
  });

  // ── Loading / gate states ──
  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdminUI) {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
          <h1 className="mt-4 text-xl font-medium text-white">Admin only</h1>
          <p className="mt-2 text-sm text-white/55">
            This page surfaces internal ops metrics. Your account isn't on the admin allowlist.
          </p>
        </div>
      </div>
    );
  }

  const s = summary.data;

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-10">
        {/* Header */}
        <header className="mb-10">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary">
            Internal · billing ops
          </p>
          <h1 className="mt-3 font-serif text-[40px] font-normal leading-[1.04] tracking-[-0.015em] text-white">
            Admin <em className="italic text-white/95">dashboard</em>
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Read-only metrics. RPCs check is_admin() server-side, this UI is just a presentation layer.
          </p>
        </header>

        {/* Top-line metrics */}
        {summary.isLoading || !s ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary/60" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard icon={DollarSign} label="MRR (est)" value={usd(s.est_mrr_usd)} sub={`ARR ${usd(s.est_arr_usd)}`} />
              <MetricCard icon={TrendingUp} label="Gross margin" value={`${s.est_gross_margin_pct.toFixed(0)}%`} sub={`${usd(s.est_gross_profit_usd)} profit`} />
              <MetricCard icon={Users} label="Paid users" value={s.total_paid_users.toLocaleString()} sub={`${s.free_users.toLocaleString()} free`} />
              <MetricCard icon={AlertTriangle} label="Anomalies (7d)" value={String(s.anomalies_this_week)} sub={`${s.standard_mode_users} in standard mode`} />
            </div>

            {/* Tier breakdown */}
            <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <h2 className="text-sm font-medium text-white/90">Tier breakdown</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                <TierTile label="Starter" count={s.starter_count} />
                <TierTile label="Pro" count={s.pro_count} highlight />
                <TierTile label="Max" count={s.max_count} />
                <TierTile label="Lifetime" count={s.lifetime_count} />
                <TierTile label="Legacy" count={s.legacy_count} muted />
              </div>
              <p className="mt-4 text-xs text-white/45">
                Month cost: <span className="text-white/75">{usd(s.month_total_cost_usd)}</span> ·
                Credits used: <span className="text-white/75">{s.month_credits_used.toLocaleString()}</span> ·
                Requests: <span className="text-white/75">{s.month_request_count.toLocaleString()}</span> ·
                Overage on: <span className="text-white/75">{s.overage_enabled_users}</span>
              </p>
            </div>
          </>
        )}

        {/* Top spenders */}
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.16em] text-white/70">Top spenders this month</h2>
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <table className="w-full">
              <thead className="border-b border-white/[0.07] text-left text-[11px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 text-right font-medium">Credits</th>
                  <th className="px-4 py-3 text-right font-medium">Our cost</th>
                  <th className="px-4 py-3 text-right font-medium">Requests</th>
                  <th className="px-4 py-3 text-center font-medium">Flags</th>
                </tr>
              </thead>
              <tbody>
                {(topSpenders.data ?? []).map((u) => (
                  <tr key={u.user_id} className="border-t border-white/[0.04] text-sm">
                    <td className="px-4 py-2.5 text-white/80">{u.email}</td>
                    <td className="px-4 py-2.5 text-white/55">{u.tier}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white">{u.credits_used.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white/80">{usd(u.cost_usd)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white/60">{u.request_count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center text-[11px]">
                      {u.in_standard_mode && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-300">standard</span>}
                      {u.overage_enabled && <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">overage</span>}
                    </td>
                  </tr>
                ))}
                {(topSpenders.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-white/35">No spend recorded this month.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Anomalies */}
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-white/70">Spend anomalies</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runDetector.mutate()}
              disabled={runDetector.isPending}
              className="h-8 gap-1.5 border-white/[0.1] bg-transparent text-xs text-white hover:bg-white/[0.05]"
            >
              {runDetector.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Re-run detection
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <table className="w-full">
              <thead className="border-b border-white/[0.07] text-left text-[11px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Detected</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 text-right font-medium">Today</th>
                  <th className="px-4 py-3 text-right font-medium">30d avg</th>
                  <th className="px-4 py-3 text-right font-medium">×</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {(anomalies.data ?? []).map((a) => (
                  <tr key={a.id} className="border-t border-white/[0.04] text-sm">
                    <td className="px-4 py-2.5 text-white/55">{new Date(a.detected_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-white/80">{a.email}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white">{a.spend_today_credits.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white/55">{Math.round(a.baseline_avg_credits).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-rose-300">{a.multiplier.toFixed(1)}×</td>
                    <td className="px-4 py-2.5 text-xs text-white/55">{a.note ?? ""}</td>
                  </tr>
                ))}
                {(anomalies.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-white/35">No anomalies detected.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon, label, value, sub,
}: { icon: typeof TrendingUp; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 font-serif text-[32px] leading-none tracking-tight tabular-nums text-white">{value}</p>
      {sub && <p className="mt-1.5 text-[11.5px] text-white/45">{sub}</p>}
    </div>
  );
}

function TierTile({ label, count, highlight, muted }: { label: string; count: number; highlight?: boolean; muted?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${
      highlight ? "border-primary/30 bg-primary/[0.08]"
      : muted ? "border-white/[0.04] bg-white/[0.01]"
      : "border-white/[0.07] bg-white/[0.02]"
    }`}>
      <p className={`text-[10px] uppercase tracking-wider ${muted ? "text-white/30" : "text-white/45"}`}>{label}</p>
      <p className={`mt-1 font-serif text-xl tabular-nums ${muted ? "text-white/40" : "text-white"}`}>{count.toLocaleString()}</p>
    </div>
  );
}
