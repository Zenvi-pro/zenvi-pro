import { describe, expect, it } from "vitest";
import {
  buildPriceDisplay,
  buildPriceIdMap,
  formatCents,
  parsePlanKey,
  resolveTierName,
  stripePriceIdForRow,
  type TierConfigRow,
  type TierPriceLookup,
} from "./tier-prices.ts";

function row(overrides: Partial<TierConfigRow> = {}): TierConfigRow {
  return {
    tier: "pro",
    monthly_points: 550,
    annual_monthly_points: 6600,
    seats: 3,
    stripe_monthly_price_id: "price_live_monthly",
    stripe_annual_price_id: "price_live_annual",
    stripe_monthly_price_id_sandbox: "price_sandbox_monthly",
    stripe_annual_price_id_sandbox: "price_sandbox_annual",
    ...overrides,
  };
}

describe("formatCents", () => {
  it("keeps the established USD output", () => {
    expect(formatCents(2900, "usd")).toBe("$29");
    expect(formatCents(46800, "usd")).toBe("$468");
    expect(formatCents(2999, "usd")).toBe("$29.99");
  });

  it("no longer divides zero-decimal currencies by 100", () => {
    expect(formatCents(4500, "jpy")).toContain("4,500");
  });
});

describe("buildPriceDisplay", () => {
  it("renders a monthly price", () => {
    expect(buildPriceDisplay(4900, "usd", "month")).toEqual({
      amount_cents: 4900,
      currency: "usd",
      display: "$49",
      period: "/mo",
      minor_unit_exponent: 2,
    });
  });

  it("adds a monthly equivalent to annual prices", () => {
    const annual = buildPriceDisplay(46800, "usd", "year");
    expect(annual.period).toBe("/yr");
    expect(annual.display).toBe("$468");
    expect(annual.monthly_equivalent_cents).toBe(3900);
    expect(annual.monthly_equivalent_display).toBe("$39");
    expect(annual.monthly_equivalent_period).toBe("/mo");
  });

  it("carries the minor-unit exponent for zero-decimal currencies", () => {
    const jpy = buildPriceDisplay(4500, "jpy", "month");
    expect(jpy.minor_unit_exponent).toBe(0);
    expect(jpy.display).toContain("4,500");
  });

  it("reports a non-recurring price with no period", () => {
    expect(buildPriceDisplay(9900, "usd", undefined).period).toBe("");
  });

  it("renders CAD amounts from the currency_options table", () => {
    expect(buildPriceDisplay(27900, "cad", "month").amount_cents).toBe(27900);
    expect(buildPriceDisplay(249900, "cad", "year").monthly_equivalent_cents).toBe(20825);
  });
});

describe("resolveTierName", () => {
  it("maps legacy tiers onto canonical ones", () => {
    expect(resolveTierName("creator")).toBe("starter");
    expect(resolveTierName("studio")).toBe("max");
    expect(resolveTierName("none")).toBe("free");
  });

  it("passes canonical tiers through", () => {
    expect(resolveTierName("free")).toBe("free");
    expect(resolveTierName("starter")).toBe("starter");
    expect(resolveTierName("pro")).toBe("pro");
    expect(resolveTierName("max")).toBe("max");
  });

  it("lowercases and tolerates unknown input", () => {
    expect(resolveTierName("PRO")).toBe("pro");
    expect(resolveTierName("Creator")).toBe("starter");
    expect(resolveTierName("enterprise")).toBe("enterprise");
    expect(resolveTierName(undefined as unknown as string)).toBe("free");
  });
});

describe("parsePlanKey", () => {
  it("splits the six canonical plan keys", () => {
    expect(parsePlanKey("starter_monthly")).toEqual({ tier: "starter", interval: "monthly" });
    expect(parsePlanKey("starter_annual")).toEqual({ tier: "starter", interval: "annual" });
    expect(parsePlanKey("pro_monthly")).toEqual({ tier: "pro", interval: "monthly" });
    expect(parsePlanKey("pro_annual")).toEqual({ tier: "pro", interval: "annual" });
    expect(parsePlanKey("max_monthly")).toEqual({ tier: "max", interval: "monthly" });
    expect(parsePlanKey("max_annual")).toEqual({ tier: "max", interval: "annual" });
  });

  it("handles legacy plan keys", () => {
    expect(parsePlanKey("creator_annual")).toEqual({ tier: "creator", interval: "annual" });
    expect(parsePlanKey("studio_monthly")).toEqual({ tier: "studio", interval: "monthly" });
  });

  it("defaults a suffixless key to monthly", () => {
    expect(parsePlanKey("pro")).toEqual({ tier: "pro", interval: "monthly" });
  });
});

describe("stripePriceIdForRow", () => {
  const liveReq = new Request("https://example.test/get-tier-pricing");
  const sandboxReq = new Request("https://example.test/get-tier-pricing?stripe_test=1");

  it("selects live columns by default", () => {
    expect(stripePriceIdForRow(row(), "monthly", liveReq)).toBe("price_live_monthly");
    expect(stripePriceIdForRow(row(), "annual", liveReq)).toBe("price_live_annual");
  });

  it("selects sandbox columns in test mode", () => {
    expect(stripePriceIdForRow(row(), "monthly", sandboxReq)).toBe("price_sandbox_monthly");
    expect(stripePriceIdForRow(row(), "annual", sandboxReq)).toBe("price_sandbox_annual");
  });

  it("returns null when the column is unset, e.g. the free tier", () => {
    const free = row({
      tier: "free",
      stripe_monthly_price_id: null,
      stripe_annual_price_id: null,
      stripe_monthly_price_id_sandbox: null,
      stripe_annual_price_id_sandbox: null,
    });
    expect(stripePriceIdForRow(free, "monthly", liveReq)).toBeNull();
    expect(stripePriceIdForRow(free, "annual", sandboxReq)).toBeNull();
  });
});

describe("buildPriceIdMap", () => {
  it("keys every lookup by price id", () => {
    const lookups: TierPriceLookup[] = [
      { priceId: "price_a", tier: "starter", interval: "monthly" },
      { priceId: "price_b", tier: "max", interval: "annual" },
    ];
    const map = buildPriceIdMap(lookups);
    expect(map.get("price_a")).toEqual({ tier: "starter", interval: "monthly" });
    expect(map.get("price_b")).toEqual({ tier: "max", interval: "annual" });
    expect(map.get("price_missing")).toBeUndefined();
  });

  it("is empty for no lookups", () => {
    expect(buildPriceIdMap([]).size).toBe(0);
  });
});
