import { describe, expect, it } from "vitest";
import { planNewPricingRows, type ModelsDevCatalog, type PricingRow } from "./model-pricing.ts";

const text = { output: ["text"] };

function catalog(models: Record<string, unknown>, provider = "anthropic"): ModelsDevCatalog {
  return { [provider]: { models } } as ModelsDevCatalog;
}

function row(provider: string, model_pattern: string, input: number, output: number): PricingRow {
  return { provider, model_pattern, input_cost_per_million: input, output_cost_per_million: output };
}

describe("planNewPricingRows", () => {
  it("adds a row for a model only the provider catch-all matches", () => {
    const plan = planNewPricingRows(
      catalog(
        { "gemini-4-argon": { cost: { input: 2, output: 10, cache_read: 0.1 }, modalities: text } },
        "google",
      ),
      [row("google", "%", 0.075, 0.3)],
    );
    expect(plan).toEqual([
      {
        provider: "google",
        model_pattern: "gemini-4-argon%",
        input_cost_per_million: 2,
        output_cost_per_million: 10,
        cache_read_cost_per_million: 0.1,
        cache_write_cost_per_million: 0,
      },
    ]);
  });

  it("adds a row when a family row charges the wrong price", () => {
    const plan = planNewPricingRows(
      catalog({
        "claude-haiku-5-5": {
          cost: { input: 0.1, output: 0.5, cache_read: 0.01, cache_write: 0.125 },
          modalities: text,
        },
      }),
      [row("anthropic", "claude-haiku%", 0.25, 1.25)],
    );
    expect(plan.map((r) => r.model_pattern)).toEqual(["claude-haiku-5-5%"]);
  });

  it("leaves models the table already prices correctly, and never touches curated rows", () => {
    const plan = planNewPricingRows(
      catalog({
        // family row already charges the list price
        "claude-opus-4-8": { cost: { input: 5, output: 25 }, modalities: text },
        // its own row exists with a hand-tuned price: keep it
        "claude-fable-5-1": { cost: { input: 99, output: 99 }, modalities: text },
        // dated variant matches its alias row at the same price
        "claude-sonnet-4-5-20250929": { cost: { input: 3, output: 15 }, modalities: text },
      }),
      [
        row("anthropic", "claude-opus%", 5, 25),
        row("anthropic", "claude-fable-5-1%", 10, 50),
        row("anthropic", "claude-fable%", 10, 50),
        row("anthropic", "claude-sonnet-4-5%", 3, 15),
      ],
    );
    expect(plan).toEqual([]);
  });

  it("skips non-chat, unpriced and unsupported providers' models", () => {
    const plan = planNewPricingRows(
      {
        openai: {
          models: {
            "gpt-image-2": { cost: { input: 5, output: 30 }, modalities: { output: ["image"] } },
            "text-embedding-3-large": { cost: { input: 0.13, output: 0 }, modalities: text },
            "gpt-image-1": { modalities: { output: ["image"] } },
            "gpt-realtime-2.1": { cost: { input: 4, output: 24 }, modalities: { output: ["text", "audio"] } },
            "weird_name": { cost: { input: 1, output: 1 }, modalities: text },
          },
        },
        mistral: { models: { "mistral-large": { cost: { input: 2, output: 6 }, modalities: text } } },
      } as ModelsDevCatalog,
      [],
    );
    expect(plan).toEqual([]);
  });

  it("skips text-output models the backend treats as non-chat by name", () => {
    const priced = { cost: { input: 1.25, output: 10 }, modalities: text };
    const plan = planNewPricingRows(
      {
        google: {
          models: {
            "gemini-2.5-computer-use-preview-10-2025": priced,
            "deep-research-lite": priced,
            "gemini-4-argon": priced,
          },
        },
        openai: {
          models: {
            "gpt-4o-transcribe": priced,
            "omni-moderation-latest": priced,
            "gpt-5-search-api": priced,
            "gpt-3.5-turbo-instruct": priced,
          },
        },
      } as ModelsDevCatalog,
      [],
    );
    expect(plan.map((r) => r.model_pattern)).toEqual(["gemini-4-argon%"]);
  });

  it("does not add a dated variant once its new alias row covers it", () => {
    const plan = planNewPricingRows(
      catalog({
        "claude-opus-6-20270101": { cost: { input: 3, output: 15 }, modalities: text },
        "claude-opus-6": { cost: { input: 3, output: 15 }, modalities: text },
      }),
      [row("anthropic", "%", 3, 15), row("anthropic", "claude-opus%", 5, 25)],
    );
    expect(plan.map((r) => r.model_pattern)).toEqual(["claude-opus-6%"]);
  });
});
