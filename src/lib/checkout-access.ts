import { ACCESS_CODE_KEY, CHECKOUT_ACCESS_CODE_KEY } from "@/components/AccessCodeForm";
import { supabase } from "@/integrations/supabase/client";
import {
  clampPlanKeyToAllowedTier,
  hasActivePaidSubscription,
} from "@/lib/checkout-routing";

/** Remove session tokens that were stored before explicit claim (legacy email bypass). */
function clearStaleSessionAccessCodes(): void {
  sessionStorage.removeItem(CHECKOUT_ACCESS_CODE_KEY);
  sessionStorage.removeItem(ACCESS_CODE_KEY);
}

/**
 * Resolve a checkout access code only when the user has previously claimed a token.
 * Session storage is NOT used for gate bypass — unclaimed invites must use the form.
 */
export async function resolveCheckoutAccessCode(): Promise<string | null> {
  const { data: claimedToken, error } = await supabase.rpc("get_user_claimed_waitlist_token");
  if (!error && claimedToken) {
    const token = String(claimedToken);
    sessionStorage.setItem(CHECKOUT_ACCESS_CODE_KEY, token);
    return token;
  }

  clearStaleSessionAccessCodes();
  return null;
}

export type CheckoutAccessState =
  | { kind: "resolved"; code: string }
  | { kind: "required" }
  | { kind: "skip"; reason: "paid_plan_change" };

/** Decide whether checkout needs an access code or can proceed. */
export async function resolveCheckoutAccess(opts: {
  skipForPlanChange: boolean;
}): Promise<CheckoutAccessState> {
  if (opts.skipForPlanChange) {
    return { kind: "skip", reason: "paid_plan_change" };
  }

  const code = await resolveCheckoutAccessCode();
  if (code) {
    return { kind: "resolved", code };
  }

  return { kind: "required" };
}

/** Validate token against target plan tier before checkout. */
export async function validateTokenForPlan(
  token: string,
  targetTier: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("validate_token_for_plan", {
    token,
    target_tier: targetTier,
  });
  return !error && !!data;
}

/** True when the user has previously claimed a waitlist token (download flow). */
export async function hasClaimedDownloadAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc("get_user_download_access");
  return !error && !!data;
}

export function clearCheckoutAccessCode(): void {
  sessionStorage.removeItem(CHECKOUT_ACCESS_CODE_KEY);
}

/** Invite max tier for the current user (starter/pro/max), or null if unrestricted. */
export async function getUserWaitlistAllowedTier(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_user_waitlist_allowed_tier");
  if (error || data == null || data === "") return null;
  return String(data);
}

/** Clamp a /checkout?plan=... path to the user's invite allowed_tier when unpaid. */
export async function clampCheckoutPathIfNeeded(
  path: string,
  opts: { skipIfPaid: boolean },
): Promise<string> {
  if (!path.startsWith("/checkout")) return path;

  let url: URL;
  try {
    url = new URL(path, window.location.origin);
  } catch {
    return path;
  }

  const planKey = url.searchParams.get("plan");
  if (!planKey) return path;

  if (opts.skipIfPaid) {
    const { data: sub } = await supabase.rpc("get_user_subscription");
    const subRow = sub && sub.length > 0 ? sub[0] : null;
    const currentTier = subRow ? (subRow.tier as string) : "free";
    const hasStripeSub = !!subRow?.stripe_subscription_id;
    if (hasStripeSub && hasActivePaidSubscription(currentTier)) {
      return path;
    }
  }

  const allowedTier = await getUserWaitlistAllowedTier();
  const clamped = clampPlanKeyToAllowedTier(planKey, allowedTier);
  if (clamped === planKey) return path;

  url.searchParams.set("plan", clamped);
  url.searchParams.delete("mode");
  return `${url.pathname}${url.search}`;
}
