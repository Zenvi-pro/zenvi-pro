/**
 * Out-of-credits modal — appears on the dashboard when the user has hit
 * standard mode (paid features paused) OR is sitting at ≤ 0 credits.
 *
 * Two paths out:
 *   1. Upgrade plan        → /pricing (or /checkout?plan=<next>_monthly for paid users)
 *   2. Enable overage      → inline RPC call to update_overage_settings;
 *                            free / lifetime users see "not available on your plan"
 *
 * Dismiss state lives in sessionStorage so the modal doesn't spam — it
 * reopens once per browser session when the conditions stay true. The
 * dashboard banner below the credit card stays visible regardless.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, Zap, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "ooc-modal-dismissed-at";
const DISMISS_TTL_MS = 60 * 60 * 1000; // re-show after 1h if still out

interface OutOfCreditsModalProps {
  open: boolean;
  tier: string;
  balance: number;
  overageEnabled: boolean;
  inStandardMode: boolean;
  onClose: () => void;
  onOverageEnabled?: () => void;
}

const TIER_LABEL: Record<string, string> = {
  free:     "Free",
  starter:  "Starter",
  pro:      "Pro",
  max:      "Max",
  lifetime: "Lifetime",
  creator:  "Starter",   // legacy alias
  studio:   "Max",       // legacy alias
};

const NEXT_TIER: Record<string, string> = {
  free:    "starter",
  starter: "pro",
  pro:     "max",
  creator: "pro",
  studio:  "max",        // already at max — pricing page covers it
};

const OVERAGE_DEFAULT_CAP: Record<string, number> = {
  starter: 50,
  pro:     150,
  max:     500,
};

export default function OutOfCreditsModal({
  open, tier, balance, overageEnabled, inStandardMode,
  onClose, onOverageEnabled,
}: OutOfCreditsModalProps) {
  const [enablingOverage, setEnablingOverage] = useState(false);
  const [overageError, setOverageError] = useState<string | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tierLabel = TIER_LABEL[tier] ?? tier;
  const next = NEXT_TIER[tier];
  const upgradeHref = next ? `/checkout?plan=${next}_monthly` : "/pricing";
  const upgradeCta  = tier === "free" ? "Upgrade to Starter" : next ? `Upgrade to ${TIER_LABEL[next]}` : "See plans";
  const canOverage  = tier !== "free" && tier !== "lifetime";

  async function enableOverage() {
    setEnablingOverage(true);
    setOverageError(null);
    try {
      const cap = OVERAGE_DEFAULT_CAP[tier] ?? 50;
      const { error } = await supabase.rpc("update_overage_settings", {
        p_enabled: true,
        p_limit_usd: cap,
      });
      if (error) throw error;
      onOverageEnabled?.();
      onClose();
    } catch (e) {
      setOverageError(e instanceof Error ? e.message : "Could not enable overage");
    } finally {
      setEnablingOverage(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ooc-title"
        className="relative w-full max-w-md rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#0f1116] via-[#0a0c11] to-[#08090c] p-7 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)]"
      >
        {/* Edge glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent"
        />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="rounded-full border border-rose-500/25 bg-rose-500/10 p-2">
            <AlertTriangle className="h-4 w-4 text-rose-300" />
          </div>
          <div className="flex-1">
            <h2 id="ooc-title" className="font-serif text-[22px] leading-tight text-white">
              You've run out of credits
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
              {tier === "free"
                ? `Your Free plan's 100 monthly credits are gone. Upgrade for a real allowance, or stay on Ollama local models — those stay free.`
                : `Your ${tierLabel} plan's monthly credits are used up. ${
                    overageEnabled
                      ? "Overage is on — you'll continue at sticker rates until your cap is hit."
                      : "Paid AI features are paused until next cycle. Upgrade or turn on overage to keep going."
                  }`}
            </p>

            {inStandardMode && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/[0.08] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-amber-300">
                <span aria-hidden className="h-1 w-1 rounded-full bg-amber-300" />
                Standard mode — local models only
              </p>
            )}
          </div>
        </div>

        {/* Balance snapshot */}
        <div className="mt-5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-wider text-white/40">Balance</span>
            <span className="font-serif text-[18px] tabular-nums text-white">{balance.toLocaleString()} cr</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-wider text-white/40">Plan</span>
            <span className="text-[13px] text-white/75">Zenvi {tierLabel}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            to={upgradeHref}
            className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white text-[13px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            <Zap className="h-3.5 w-3.5" />
            {upgradeCta}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>

          {canOverage && !overageEnabled && (
            <Button
              variant="outline"
              onClick={enableOverage}
              disabled={enablingOverage}
              className="h-10 w-full gap-2 border-white/[0.1] bg-transparent text-[13px] font-medium text-white hover:bg-white/[0.05]"
            >
              {enablingOverage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Enable overage (${OVERAGE_DEFAULT_CAP[tier] ?? 50} cap)
            </Button>
          )}

          {canOverage && overageEnabled && (
            <Link
              to="/dashboard/usage#overage"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-transparent text-[13px] font-medium text-white/80 hover:bg-white/[0.05] hover:text-white"
            >
              Increase overage cap
            </Link>
          )}

          {overageError && (
            <p className="text-center text-[11.5px] text-rose-300">{overageError}</p>
          )}

          <button
            onClick={onClose}
            className="mt-1 text-[11.5px] text-white/40 transition-colors hover:text-white/70"
          >
            Dismiss for this session
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Helper hook: decide whether the modal should be open right now ──────────
export function shouldShowOocModal(balance: number, inStandardMode: boolean): boolean {
  if (!(inStandardMode || balance <= 0)) return false;
  const dismissedAt = sessionStorage.getItem(STORAGE_KEY);
  if (!dismissedAt) return true;
  const age = Date.now() - parseInt(dismissedAt, 10);
  return age > DISMISS_TTL_MS;
}

export function markOocModalDismissed() {
  sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
}
