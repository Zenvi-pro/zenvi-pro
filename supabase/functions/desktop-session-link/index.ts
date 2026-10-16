import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// A one-time sign-in link for the signed-in caller's own account, so the
// website can give the Zenvi desktop app a session of its own.
//
// Why: the website used to hand the desktop app the browser's own tokens.
// Supabase rotates refresh tokens, so two apps sharing one session keep
// invalidating each other, and once one of them falls two refreshes behind,
// Supabase revokes the whole session -- signing the user out of the website
// and the desktop app at random, and asking for their password again.
//
// The caller redeems the returned token hash in their own browser
// (verifyOtp, see src/lib/desktop-handoff.ts) for a brand-new session. No email
// is sent, and the link is only ever for the caller: the email comes from
// their verified JWT, never from the request.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  // Bearer-token API (no cookies), called from zenvi.pro and preview deployments.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user?.email) return json({ error: "Unauthorized" }, 401);

  // Only for a desktop sign-in that is still waiting: retries and repeated
  // clicks don't leave extra sessions nobody holds.
  const { state } = await req.json().catch(() => ({}));
  if (typeof state !== "string" || !UUID.test(state)) return json({ error: "Missing sign-in state" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: existing, error: lookupError } = await admin
    .from("desktop_auth_sessions").select("state").eq("state", state).maybeSingle();
  if (lookupError) {
    console.error("desktop-session-link: lookup failed", lookupError.message);
    return json({ error: "Could not create a desktop sign-in" }, 500);
  }
  if (existing) return json({ error: "This sign-in was already completed" }, 409);

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
  if (error || !data?.properties?.hashed_token || data.user?.id !== user.id) {
    console.error("desktop-session-link: could not create a sign-in link", error?.message ?? "no token");
    return json({ error: "Could not create a desktop sign-in" }, 500);
  }

  return json({ token_hash: data.properties.hashed_token });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
