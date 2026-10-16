import { createClient, type Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hands a sign-in to the Zenvi desktop app that opened /login?state=<uuid>.
 *
 * The desktop app gets a session of its own, not this browser's. Supabase
 * rotates refresh tokens, so two apps sharing one session keep invalidating
 * each other; once one falls two refreshes behind, Supabase revokes the
 * session for both. That signed people out of the website and the app at
 * random, and sent them back to the password form.
 *
 * The desktop-session-link edge function issues a one-time sign-in link for
 * the signed-in user; a throwaway client redeems it here, in this browser, for
 * a brand-new session. If that isn't possible (the function isn't deployed, a
 * rate limit), this browser's own session is handed over as before, so
 * signing in to the desktop app never breaks.
 *
 * Returns false when the hand-off could not be recorded.
 */
export async function completeDesktopSignIn(state: string, session: Session): Promise<boolean> {
  let handoff: Pick<Session, "access_token" | "refresh_token"> = session;
  try {
    const own = await mintDesktopSession(session.user.id);
    if (own) handoff = own;
  } catch (err) {
    console.warn("Desktop sign-in: sharing this browser's session instead", err);
  }

  const { data, error } = await supabase.rpc("complete_desktop_auth_session", {
    session_state: state,
    p_access_token: handoff.access_token,
    p_refresh_token: handoff.refresh_token,
  });
  if (error) {
    console.error("Desktop sign-in could not be completed", error);
    return false;
  }
  return data !== false;
}

/** A new, independent session for the signed-in user, or null. */
export async function mintDesktopSession(userId: string): Promise<Session | null> {
  const { data, error } = await supabase.functions.invoke<{ token_hash?: string }>("desktop-session-link", {
    body: {},
  });
  if (error || !data?.token_hash) return null;

  // Never touches this browser's stored session: in memory only, no refresh timer.
  const throwaway = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "zenvi-desktop-handoff",
    },
  });
  const { data: verified, error: verifyError } = await throwaway.auth.verifyOtp({
    token_hash: data.token_hash,
    type: "magiclink",
  });
  const desktop = verified?.session;
  if (verifyError || !desktop || desktop.user.id !== userId) return null;
  return desktop;
}

/** The signed-in user this browser could hand to the desktop app, checked with the server. */
export async function currentAccount(): Promise<{ session: Session; email: string } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  // getUser() asks the server, so a revoked or expired session isn't offered.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.id !== session.user.id) return null;
  const { data: { session: fresh } } = await supabase.auth.getSession();
  return fresh ? { session: fresh, email: user.email ?? "" } : null;
}
