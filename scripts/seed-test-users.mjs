/**
 * Creates 3 test accounts in Supabase for local testing:
 *   1. full-access  — claimed access code + active subscription
 *   2. code-only    — claimed access code, NO subscription
 *   3. no-access    — no code, no subscription (plain signup)
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<your-key> node scripts/seed-test-users.mjs
 */

const SUPABASE_URL = "https://xktarhzbrdnxkaovtdxj.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

// Access codes from migrations (pick ones that are still unused in your DB)
// swap these out if they've already been used
const CODE_FOR_FULL_ACCESS  = "8b1158a5-7bb7-4976-8cca-8046af8b7b50";
const CODE_FOR_CODE_ONLY    = "cc9ef45f-94b7-4ed1-9b2e-a6361e08a256";

const TEST_USERS = [
  { email: "test-full@zenvi.internal",     password: "Zenvi2026!", label: "full-access" },
  { email: "test-codeonly@zenvi.internal",  password: "Zenvi2026!", label: "code-only" },
  { email: "test-noaccess@zenvi.internal",  password: "Zenvi2026!", label: "no-access" },
];

async function adminPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function dbPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`INSERT ${table} failed: ${JSON.stringify(data)}`);
  return data;
}

async function dbPatch(table, filter, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PATCH ${table} failed: ${JSON.stringify(data)}`);
  return data;
}

async function createUser(email, password) {
  const data = await adminPost("", {
    email,
    password,
    email_confirm: true, // skip email confirmation
  });
  return data.id;
}

(async () => {
  console.log("Creating test users...\n");

  // ── 1. full-access ────────────────────────────────────────────────────────
  const fullId = await createUser(TEST_USERS[0].email, TEST_USERS[0].password);
  console.log(`✓ Created full-access user: ${TEST_USERS[0].email} (${fullId})`);

  // Claim the access code for this user
  await dbPatch(
    "waitlist",
    `access_token=eq.${CODE_FOR_FULL_ACCESS}`,
    { used_by: fullId, used_at: new Date().toISOString(), status: "used" },
  );
  console.log(`  ✓ Claimed code ${CODE_FOR_FULL_ACCESS}`);

  // Insert active subscription
  await dbPost("subscriptions", {
    user_id: fullId,
    tier: "creator",
    status: "active",
    billing_interval: "monthly",
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancel_at_period_end: false,
  });
  console.log(`  ✓ Active Creator subscription inserted\n`);

  // ── 2. code-only ─────────────────────────────────────────────────────────
  const codeId = await createUser(TEST_USERS[1].email, TEST_USERS[1].password);
  console.log(`✓ Created code-only user: ${TEST_USERS[1].email} (${codeId})`);

  // Claim the access code (no subscription)
  await dbPatch(
    "waitlist",
    `access_token=eq.${CODE_FOR_CODE_ONLY}`,
    { used_by: codeId, used_at: new Date().toISOString(), status: "used" },
  );
  console.log(`  ✓ Claimed code ${CODE_FOR_CODE_ONLY}`);
  console.log(`  ✓ No subscription (should be blocked from /download and /dashboard)\n`);

  // ── 3. no-access ─────────────────────────────────────────────────────────
  const noneId = await createUser(TEST_USERS[2].email, TEST_USERS[2].password);
  console.log(`✓ Created no-access user: ${TEST_USERS[2].email} (${noneId})`);
  console.log(`  ✓ No code, no subscription\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Test credentials (all same password: Zenvi2026!)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`FULL ACCESS   → ${TEST_USERS[0].email}`);
  console.log(`CODE ONLY     → ${TEST_USERS[1].email}`);
  console.log(`NO ACCESS     → ${TEST_USERS[2].email}`);
  console.log(`PASSWORD      → Zenvi2026!`);
})();
