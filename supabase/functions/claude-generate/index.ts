/**
 * Claude generate edge function.
 *
 * Proxies requests to the Anthropic Claude API, enforces per-user
 * usage limits, and records consumption to api_usage.
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY   – API key from console.anthropic.com
 *
 * Request body:
 *   {
 *     messages: Array<{ role: "user" | "assistant"; content: string }>,
 *     model?:   string,   // default: "claude-opus-4-6"
 *     system?:  string,
 *     max_tokens?: number // default: 4096
 *   }
 *
 * Responses:
 *   - application/json  (non-streaming)
 *   - text/event-stream (streaming, pass stream: true in body)
 */

import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_MODEL = "claude-opus-4-6";
const DEFAULT_MAX_TOKENS = 4096;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── API key check ────────────────────────────────────────────────────────────
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    console.error("claude-generate: ANTHROPIC_API_KEY is not set");
    return json({ error: "Missing ANTHROPIC_API_KEY" }, 500);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // ── Parse body ────────────────────────────────────────────────────────────────
  let body: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    model?: string;
    system?: string;
    max_tokens?: number;
    stream?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.messages || body.messages.length === 0) {
    return json({ error: "messages array is required" }, 400);
  }

  const model = body.model ?? DEFAULT_MODEL;
  const maxTokens = body.max_tokens ?? DEFAULT_MAX_TOKENS;
  const useStream = body.stream === true;

  // ── Usage guard ───────────────────────────────────────────────────────────────
  // Rough estimate: ~$0.01 per request as a gating check.
  const { data: allowed } = await supabase.rpc("check_usage_allowed", {
    p_estimated_cost: 0.01,
  });
  if (!allowed) {
    return json({ error: "Monthly usage limit reached. Upgrade your plan to continue." }, 429);
  }

  // ── Call Claude ───────────────────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const params: Anthropic.MessageCreateParams = {
    model,
    max_tokens: maxTokens,
    messages: body.messages,
    ...(body.system ? { system: body.system } : {}),
  };

  try {
    if (useStream) {
      // ── Streaming response ─────────────────────────────────────────────────
      const stream = anthropic.messages.stream(params);

      const encoder = new TextEncoder();
      let inputTokens = 0;
      let outputTokens = 0;

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
              );
            }
            const final = await stream.finalMessage();
            inputTokens = final.usage.input_tokens;
            outputTokens = final.usage.output_tokens;
          } finally {
            controller.close();
            // Record usage after stream completes (fire-and-forget)
            recordUsage(supabase, user.id, model, inputTokens, outputTokens).catch(
              (e) => console.error("claude-generate: usage record failed", e),
            );
          }
        },
      });

      return new Response(readable, {
        headers: {
          ...CORS,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── Non-streaming response ───────────────────────────────────────────────
    const message = await anthropic.messages.create(params);

    // Record usage (fire-and-forget — don't fail the response if this errors)
    recordUsage(
      supabase,
      user.id,
      model,
      message.usage.input_tokens,
      message.usage.output_tokens,
    ).catch((e) => console.error("claude-generate: usage record failed", e));

    return json({
      id: message.id,
      content: message.content,
      model: message.model,
      stop_reason: message.stop_reason,
      usage: message.usage,
    });
  } catch (err) {
    console.error("claude-generate: Anthropic API error:", err);
    const status = (err as { status?: number }).status ?? 500;
    return json({ error: (err as Error).message }, status);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function recordUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  await supabase.rpc("batch_record_api_usage", {
    records: JSON.stringify([
      {
        provider: "anthropic",
        model,
        operation: "chat",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        units: 1,
        recorded_at: new Date().toISOString(),
      },
    ]),
  });
}
