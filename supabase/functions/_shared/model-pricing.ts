/**
 * Plans new `api_pricing` rows for chat models from the models.dev catalog.
 *
 * Only adds rows, never changes one: a model gets its own `<id>%` row when the
 * table would otherwise bill it at a different list price (usually through a
 * provider's `%` catch-all or an older family row). Rows already in the table
 * are hand-curated and stay as they are. A model with its own row is what puts
 * it in the backend's model picker.
 *
 * No remote imports, so vitest can load it.
 */

/** models.dev provider keys that match the backend's chat providers. */
export const CHAT_PROVIDERS = ["openai", "anthropic", "google", "xai"];

interface ModelsDevModel {
  cost?: { input?: number; output?: number; cache_read?: number; cache_write?: number };
  modalities?: { output?: string[] };
}

export type ModelsDevCatalog = Record<string, { models?: Record<string, ModelsDevModel> }>;

export interface PricingRow {
  provider: string;
  model_pattern: string;
  input_cost_per_million: number | string;
  output_cost_per_million: number | string;
}

export interface NewPricingRow {
  provider: string;
  model_pattern: string;
  input_cost_per_million: number;
  output_cost_per_million: number;
  cache_read_cost_per_million: number;
  cache_write_cost_per_million: number;
}

/** SQL LIKE as an anchored, case-insensitive regex (same as the backend). */
function likeRegex(pattern: string): RegExp {
  const body = [...pattern]
    .map((ch) => (ch === "%" ? ".*" : ch === "_" ? "." : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("");
  return new RegExp(`^${body}$`, "i");
}

/** The row `compute_llm_credits` would bill this model at: longest matching pattern wins. */
function billedRow<T extends PricingRow>(rows: T[], provider: string, model: string): T | undefined {
  return rows
    .filter((r) => r.provider === provider && likeRegex(r.model_pattern).test(model))
    .sort((a, b) => b.model_pattern.length - a.model_pattern.length)[0];
}

export function planNewPricingRows(catalog: ModelsDevCatalog, existing: PricingRow[]): NewPricingRow[] {
  const rows: PricingRow[] = [...existing];
  const plan: NewPricingRow[] = [];
  for (const provider of CHAT_PROVIDERS) {
    // Shortest id first, so an alias row is in place before its dated variants are checked.
    const models = Object.entries(catalog[provider]?.models ?? {}).sort(([a], [b]) => a.length - b.length);
    for (const [id, model] of models) {
      const { input, output, cache_read = 0, cache_write = 0 } = model.cost ?? {};
      const outputs = model.modalities?.output ?? [];
      if (!input || !output || outputs.length !== 1 || outputs[0] !== "text") continue;
      // `_` and `%` are LIKE wildcards; no chat model id uses them.
      if (/[%_\\]/.test(id)) continue;

      // The `%` catch-all never counts: it keeps unpriced models off the picker.
      const billed = billedRow(rows, provider, id);
      if (
        billed &&
        billed.model_pattern !== "%" &&
        Number(billed.input_cost_per_million) === input &&
        Number(billed.output_cost_per_million) === output
      ) {
        continue;
      }
      if (rows.some((r) => r.provider === provider && r.model_pattern.toLowerCase() === `${id}%`.toLowerCase())) {
        continue;
      }
      const row: NewPricingRow = {
        provider,
        model_pattern: `${id}%`,
        input_cost_per_million: input,
        output_cost_per_million: output,
        cache_read_cost_per_million: cache_read,
        cache_write_cost_per_million: cache_write,
      };
      rows.push(row);
      plan.push(row);
    }
  }
  return plan;
}
