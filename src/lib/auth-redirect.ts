import { supabase } from "@/integrations/supabase/client";
import { clampCheckoutPathIfNeeded } from "@/lib/checkout-access";
import {
  hasActivePaidSubscription,
  planChangeDirection,
} from "@/lib/checkout-routing";

/** OAuth callback URL on the current origin (must be allowlisted in Supabase Auth). */
export function getAuthCallbackUrl(opts?: {
  next?: string | null;
  state?: string | null;
}): string {
  const url = new URL(`${window.location.origin}/auth/callback`);
  if (opts?.next) url.searchParams.set("next", opts.next);
  if (opts?.state) url.searchParams.set("state", opts.state);
  return url.toString();
}

/** Password-recovery landing URL (must be allowlisted in Supabase Auth). */
export function getPasswordResetUrl(opts?: { state?: string | null }): string {
  const url = new URL(`${window.location.origin}/reset-password`);
  if (opts?.state) url.searchParams.set("state", opts.state);
  return url.toString();
}

/**
 * Paths served by other apps behind a Vercel rewrite (the web editor at
 * /editor). React Router cannot render them, so they need a full page load.
 */
const EXTERNAL_APP_PREFIXES = ["/editor"];

export function isExternalAppPath(path: string): boolean {
  return EXTERNAL_APP_PREFIXES.some(
    (prefix) =>
      path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}#`),
  );
}

/**
 * Only same-origin, absolute paths are valid post-login destinations. Rejects
 * full URLs and protocol-relative `//host` paths so `?next=` cannot be used as
 * an open redirect once the destination is followed with a full page load.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Follow a post-login destination: router navigation, or a full load for other apps. */
export function goToPostLoginPath(dest: string, navigate: (to: string, opts?: { replace?: boolean }) => void): void {
  if (isExternalAppPath(dest)) {
    window.location.replace(dest);
    return;
  }
  navigate(dest, { replace: true });
}

/** Persist post-auth destination before OAuth (sessionStorage + callback query param). */
export function stashAuthRedirect(opts: { next?: string | null; state?: string | null }): void {
  if (opts.next) sessionStorage.setItem("auth_next", opts.next);
  if (opts.state) sessionStorage.setItem("auth_state", opts.state);
}

/** Read post-auth destination from callback URL or sessionStorage. */
export function consumeAuthRedirect(searchParams: URLSearchParams): {
  next: string | null;
  state: string | null;
} {
  const nextFromUrl = searchParams.get("next");
  const stateFromUrl = searchParams.get("state");

  const nextFromStorage = sessionStorage.getItem("auth_next");
  const stateFromStorage = sessionStorage.getItem("auth_state");

  sessionStorage.removeItem("auth_next");
  sessionStorage.removeItem("auth_state");

  return {
    next: safeNextPath(nextFromUrl ?? nextFromStorage),
    state: stateFromUrl ?? stateFromStorage,
  };
}

const PLAN_TIER: Record<string, string> = {
  starter_monthly: "starter",
  starter_annual: "starter",
  pro_monthly: "pro",
  pro_annual: "pro",
  max_monthly: "max",
  max_annual: "max",
  creator_monthly: "starter",
  creator_annual: "starter",
  studio_monthly: "max",
  studio_annual: "max",
};

function parseCheckoutNext(next: string | null): { planKey: string; targetTier: string } | null {
  if (!next || !next.startsWith("/checkout")) return null;
  try {
    const url = new URL(next, window.location.origin);
    const planKey = url.searchParams.get("plan");
    if (!planKey) return null;
    const targetTier = PLAN_TIER[planKey];
    if (!targetTier) return null;
    return { planKey, targetTier };
  } catch {
    return null;
  }
}

/** Smart post-login path: avoid spurious checkout when user already has matching paid sub. */
export async function resolvePostLoginPath(next: string | null): Promise<string> {
  if (!next) return "/download";

  const checkout = parseCheckoutNext(next);
  if (!checkout) return next;

  const { data: sub } = await supabase.rpc("get_user_subscription");
  const subRow = sub && sub.length > 0 ? sub[0] : null;
  const currentTier = subRow ? (subRow.tier as string) : "free";
  const hasStripeSub = !!subRow?.stripe_subscription_id;

  if (!hasStripeSub || !hasActivePaidSubscription(currentTier)) {
    return clampCheckoutPathIfNeeded(`/checkout?plan=${checkout.planKey}`, {
      skipIfPaid: false,
    });
  }

  const direction = planChangeDirection(currentTier, checkout.targetTier);
  if (direction === "same") return "/download";
  if (direction === "upgrade" || direction === "downgrade") {
    return `/checkout?plan=${checkout.planKey}&mode=${direction}`;
  }

  return `/checkout?plan=${checkout.planKey}`;
}

// Marks a session as having come from a verified password-recovery link.
// AuthCallback consumes the PASSWORD_RECOVERY event before /reset-password mounts,
// so the reset page cannot see it; the marker is bound to the user id so an
// unrelated session can never unlock the reset form.
const RECOVERY_KEY = "zenvi:recovery-user";

export function markRecoverySession(userId: string): void {
  try {
    sessionStorage.setItem(RECOVERY_KEY, userId);
  } catch {
    /* storage unavailable: reset page falls back to PASSWORD_RECOVERY only */
  }
}

export function isRecoverySession(userId: string): boolean {
  try {
    return sessionStorage.getItem(RECOVERY_KEY) === userId;
  } catch {
    return false;
  }
}

export function clearRecoverySession(): void {
  try {
    sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* ignore */
  }
}
