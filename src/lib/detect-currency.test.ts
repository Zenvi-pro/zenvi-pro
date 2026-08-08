import { describe, expect, it } from "vitest";
import {
  countryForLanguages,
  countryForTimeZone,
  currencyForCountry,
  currencyForTimeZone,
  detectCurrency,
} from "./detect-currency";

describe("countryForTimeZone", () => {
  it("resolves exact zones", () => {
    expect(countryForTimeZone("America/Toronto")).toBe("CA");
    expect(countryForTimeZone("Europe/London")).toBe("GB");
    expect(countryForTimeZone("Asia/Tokyo")).toBe("JP");
    expect(countryForTimeZone("Asia/Kolkata")).toBe("IN");
  });

  it("resolves prefix zones", () => {
    expect(countryForTimeZone("Australia/Sydney")).toBe("AU");
    expect(countryForTimeZone("Australia/Perth")).toBe("AU");
    expect(countryForTimeZone("America/Indiana/Indianapolis")).toBe("US");
  });

  it("returns null for unmapped or missing zones", () => {
    expect(countryForTimeZone("Africa/Lagos")).toBeNull();
    expect(countryForTimeZone("")).toBeNull();
    expect(countryForTimeZone(null)).toBeNull();
  });
});

describe("currencyForTimeZone", () => {
  it("maps eurozone zones to eur", () => {
    expect(currencyForTimeZone("Europe/Berlin")).toBe("eur");
    expect(currencyForTimeZone("Europe/Madrid")).toBe("eur");
    expect(currencyForTimeZone("Europe/Dublin")).toBe("eur");
  });

  it("does not treat every Europe/* zone as eurozone", () => {
    expect(currencyForTimeZone("Europe/London")).toBe("gbp");
    // Zurich, Oslo, Stockholm, Warsaw and Prague are Europe/* but not the euro.
    expect(currencyForTimeZone("Europe/Zurich")).toBeNull();
    expect(currencyForTimeZone("Europe/Oslo")).toBeNull();
    expect(currencyForTimeZone("Europe/Stockholm")).toBeNull();
    expect(currencyForTimeZone("Europe/Warsaw")).toBeNull();
    expect(currencyForTimeZone("Europe/Prague")).toBeNull();
  });
});

describe("currencyForCountry", () => {
  it("maps supported countries", () => {
    expect(currencyForCountry("CA")).toBe("cad");
    expect(currencyForCountry("ca")).toBe("cad");
    expect(currencyForCountry("FR")).toBe("eur");
  });

  it("returns null for unsupported countries", () => {
    expect(currencyForCountry("CH")).toBeNull();
    expect(currencyForCountry("BR")).toBeNull();
    expect(currencyForCountry(null)).toBeNull();
  });
});

describe("countryForLanguages", () => {
  it("takes the first tag carrying a region", () => {
    expect(countryForLanguages(["en", "en-CA", "fr-CA"])).toBe("CA");
    expect(countryForLanguages(["fr-FR"])).toBe("FR");
  });

  it("ignores tags with no region or a malformed one", () => {
    expect(countryForLanguages(["en", "de"])).toBeNull();
    expect(countryForLanguages(["zh-Hans"])).toBeNull();
    expect(countryForLanguages([])).toBeNull();
    expect(countryForLanguages(null)).toBeNull();
  });
});

describe("detectCurrency precedence", () => {
  it("an active subscription outranks everything — its currency is immutable", () => {
    expect(
      detectCurrency({
        subscriptionCurrency: "usd",
        override: "cad",
        profileCurrency: "eur",
        timeZone: "America/Toronto",
        languages: ["en-CA"],
      }),
    ).toBe("usd");
  });

  it("an explicit override beats the stored profile and detection", () => {
    expect(
      detectCurrency({
        override: "jpy",
        profileCurrency: "eur",
        timeZone: "America/Toronto",
      }),
    ).toBe("jpy");
  });

  it("the stored profile beats detection", () => {
    expect(
      detectCurrency({ profileCurrency: "gbp", timeZone: "America/Toronto" }),
    ).toBe("gbp");
  });

  it("timezone beats language — the reported-bug regression", () => {
    // A Canadian browser frequently reports en-US while sitting in America/Toronto.
    expect(
      detectCurrency({ timeZone: "America/Toronto", languages: ["en-US"] }),
    ).toBe("cad");
  });

  it("falls through to language when the timezone is unmapped", () => {
    expect(
      detectCurrency({ timeZone: "Africa/Lagos", languages: ["en-GB"] }),
    ).toBe("gbp");
  });

  it("falls back to usd on unsupported or absent signals", () => {
    expect(detectCurrency({ timeZone: "Europe/Zurich", languages: ["de-CH"] })).toBe("usd");
    expect(detectCurrency({})).toBe("usd");
    expect(detectCurrency()).toBe("usd");
  });

  it("ignores unsupported values at every level instead of propagating them", () => {
    expect(
      detectCurrency({
        subscriptionCurrency: "chf",
        override: "brl",
        profileCurrency: "not-a-currency",
        timeZone: "Asia/Tokyo",
      }),
    ).toBe("jpy");
  });

  it("tolerates casing and whitespace in stored values", () => {
    expect(detectCurrency({ override: "  CAD " })).toBe("cad");
  });
});
