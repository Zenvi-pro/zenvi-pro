import { describe, expect, it } from "vitest";
import {
  buildCheckoutHref,
  buildPaidPlanLoginHref,
  clampPlanKeyToAllowedTier,
  hasActivePaidSubscription,
  normalizeTier,
  planChangeDirection,
  shouldUsePlanChangeApi,
  tierFromPlanKey,
} from "./checkout-routing";

describe("normalizeTier", () => {
  it("folds legacy tier names", () => {
    expect(normalizeTier("creator")).toBe("starter");
    expect(normalizeTier("studio")).toBe("max");
    expect(normalizeTier("none")).toBe("free");
  });

  it("passes canonical names through", () => {
    expect(normalizeTier("starter")).toBe("starter");
    expect(normalizeTier("pro")).toBe("pro");
    expect(normalizeTier("max")).toBe("max");
    expect(normalizeTier("free")).toBe("free");
  });
});

describe("hasActivePaidSubscription", () => {
  it("is false for every free-equivalent tier", () => {
    expect(hasActivePaidSubscription("free")).toBe(false);
    expect(hasActivePaidSubscription("none")).toBe(false);
    expect(hasActivePaidSubscription("")).toBe(false);
  });

  it("is true for paid tiers including legacy aliases", () => {
    expect(hasActivePaidSubscription("starter")).toBe(true);
    expect(hasActivePaidSubscription("pro")).toBe(true);
    expect(hasActivePaidSubscription("max")).toBe(true);
    expect(hasActivePaidSubscription("creator")).toBe(true);
    expect(hasActivePaidSubscription("studio")).toBe(true);
  });
});

describe("planChangeDirection", () => {
  it("reports 'new' for anyone without a paid tier", () => {
    expect(planChangeDirection("free", "pro")).toBe("new");
    expect(planChangeDirection("none", "starter")).toBe("new");
  });

  it("reports 'same' when the target matches the current tier", () => {
    expect(planChangeDirection("pro", "pro")).toBe("same");
    // Legacy aliases share a rank with their canonical tier.
    expect(planChangeDirection("creator", "starter")).toBe("same");
    expect(planChangeDirection("studio", "max")).toBe("same");
  });

  it("orders upgrades and downgrades across the full matrix", () => {
    expect(planChangeDirection("starter", "pro")).toBe("upgrade");
    expect(planChangeDirection("starter", "max")).toBe("upgrade");
    expect(planChangeDirection("pro", "max")).toBe("upgrade");
    expect(planChangeDirection("max", "pro")).toBe("downgrade");
    expect(planChangeDirection("max", "starter")).toBe("downgrade");
    expect(planChangeDirection("pro", "starter")).toBe("downgrade");
  });
});

describe("buildCheckoutHref", () => {
  it("omits the mode for a new subscription", () => {
    expect(buildCheckoutHref("pro_monthly", "free", "new")).toBe("/checkout?plan=pro_monthly");
  });

  it("adds the mode for a paid subscriber changing plan", () => {
    expect(buildCheckoutHref("max_monthly", "pro", "upgrade"))
      .toBe("/checkout?plan=max_monthly&mode=upgrade");
    expect(buildCheckoutHref("starter_annual", "max", "downgrade"))
      .toBe("/checkout?plan=starter_annual&mode=downgrade");
  });

  it("omits the mode when the current tier is not actually paid", () => {
    expect(buildCheckoutHref("pro_monthly", "free", "upgrade")).toBe("/checkout?plan=pro_monthly");
  });
});

describe("buildPaidPlanLoginHref", () => {
  it("round-trips the checkout path through the login next param", () => {
    expect(buildPaidPlanLoginHref("max_annual"))
      .toBe("/login?next=%2Fcheckout%3Fplan%3Dmax_annual&mode=signup");
  });
});

describe("shouldUsePlanChangeApi", () => {
  it("requires an existing Stripe subscription", () => {
    expect(shouldUsePlanChangeApi("pro", "max", false)).toBe(false);
    expect(shouldUsePlanChangeApi("pro", "max", true)).toBe(true);
  });

  it("requires the current tier to be paid", () => {
    expect(shouldUsePlanChangeApi("free", "pro", true)).toBe(false);
  });

  it("is false when the tier is unchanged", () => {
    expect(shouldUsePlanChangeApi("pro", "pro", true)).toBe(false);
  });

  it("covers downgrades as well as upgrades", () => {
    expect(shouldUsePlanChangeApi("max", "starter", true)).toBe(true);
  });
});

describe("tierFromPlanKey", () => {
  it("maps canonical and legacy plan keys", () => {
    expect(tierFromPlanKey("starter_monthly")).toBe("starter");
    expect(tierFromPlanKey("max_annual")).toBe("max");
    expect(tierFromPlanKey("creator_annual")).toBe("starter");
    expect(tierFromPlanKey("studio_monthly")).toBe("max");
  });

  it("returns null for an unknown key", () => {
    expect(tierFromPlanKey("free_monthly")).toBeNull();
    expect(tierFromPlanKey("nonsense")).toBeNull();
  });
});

describe("clampPlanKeyToAllowedTier", () => {
  it("leaves the key alone when the invite allows it", () => {
    expect(clampPlanKeyToAllowedTier("pro_monthly", "max")).toBe("pro_monthly");
    expect(clampPlanKeyToAllowedTier("pro_monthly", "pro")).toBe("pro_monthly");
  });

  it("clamps down to the invite tier, preserving the interval", () => {
    expect(clampPlanKeyToAllowedTier("max_monthly", "starter")).toBe("starter_monthly");
    expect(clampPlanKeyToAllowedTier("max_annual", "pro")).toBe("pro_annual");
  });

  it("normalizes legacy allowed tiers", () => {
    expect(clampPlanKeyToAllowedTier("max_monthly", "creator")).toBe("starter_monthly");
  });

  it("passes through when there is no allowed tier or it is free-equivalent", () => {
    expect(clampPlanKeyToAllowedTier("max_monthly", null)).toBe("max_monthly");
    expect(clampPlanKeyToAllowedTier("max_monthly", "free")).toBe("max_monthly");
  });

  it("passes through an unrecognised plan key untouched", () => {
    expect(clampPlanKeyToAllowedTier("nonsense", "starter")).toBe("nonsense");
  });
});
