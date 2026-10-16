import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// enforce_tier_caps treats 0 as "no cap". Every plan is limited by its credit balance
// only, so the latest migration that sets tier caps must zero them for all tiers (#306).
const MIGRATIONS = path.resolve(__dirname, "../../supabase/migrations");

const migrations = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(path.join(MIGRATIONS, f), "utf8"));

const last = (match: RegExp) => migrations.filter((sql) => match.test(sql)).pop() ?? "";

describe("tier caps", () => {
  it("leaves every tier uncapped on video generation and indexing", () => {
    const sql = last(/tier_config[\s\S]*max_daily_generations/);
    expect(sql).toMatch(
      /UPDATE public\.tier_config\s+SET max_daily_generations\s*=\s*0,\s*max_indexing_minutes_per_month\s*=\s*0\s*;/,
    );
  });

  it("still treats a zero cap as no cap", () => {
    const fn = last(/FUNCTION public\.enforce_tier_caps/);
    expect(fn).toMatch(/max_daily_generations > 0/);
    expect(fn).toMatch(/max_indexing_minutes_per_month > 0/);
  });
});
