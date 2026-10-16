import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CHAT_PROVIDERS, planNewPricingRows } from "../_shared/model-pricing.ts";

// Adds api_pricing rows for chat models that models.dev lists and the table does
// not price yet. Service role only. `?dry_run=1` returns the plan without writing.
Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey || req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const res = await fetch("https://models.dev/api.json");
    if (!res.ok) throw new Error(`models.dev returned ${res.status}`);
    const catalog = await res.json();

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data: existing, error } = await supabase
      .from("api_pricing")
      .select("provider, model_pattern, input_cost_per_million, output_cost_per_million")
      .in("provider", CHAT_PROVIDERS);
    if (error) throw error;

    const rows = planNewPricingRows(catalog, existing ?? []);
    if (rows.length && new URL(req.url).searchParams.get("dry_run") !== "1") {
      const { error: insertError } = await supabase
        .from("api_pricing")
        .upsert(rows, { onConflict: "provider,model_pattern", ignoreDuplicates: true });
      if (insertError) throw insertError;
    }
    return json({ added: rows });
  } catch (err) {
    console.error("sync-model-pricing:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
