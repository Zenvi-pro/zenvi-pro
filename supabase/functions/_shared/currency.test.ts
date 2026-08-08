import { describe, expect, it } from "vitest";
import {
  convertMinor,
  currencyMeta,
  DEFAULT_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  majorToMinor,
  minorToMajor,
  minorUnitExponent,
  normalizeCurrency,
  SUPPORTED_CURRENCIES,
  ZERO_DECIMAL_CURRENCIES,
} from "./currency.ts";

describe("minorUnitExponent", () => {
  it("defaults to 2", () => {
    expect(minorUnitExponent("usd")).toBe(2);
    expect(minorUnitExponent("cad")).toBe(2);
    expect(minorUnitExponent("eur")).toBe(2);
  });

  it("returns 0 for zero-decimal currencies", () => {
    expect(minorUnitExponent("jpy")).toBe(0);
    expect(minorUnitExponent("krw")).toBe(0);
  });

  it("returns 3 for three-decimal currencies", () => {
    expect(minorUnitExponent("kwd")).toBe(3);
  });

  it("is case-insensitive and safe on junk", () => {
    expect(minorUnitExponent("JPY")).toBe(0);
    expect(minorUnitExponent("")).toBe(2);
  });
});

describe("minorToMajor / majorToMinor", () => {
  it("divides by 100 for standard currencies", () => {
    expect(minorToMajor(2900, "usd")).toBe(29);
    expect(minorToMajor(2999, "cad")).toBe(29.99);
  });

  it("does NOT divide zero-decimal currencies", () => {
    // The regression this module exists for: 4500 means ¥4,500, not ¥45.
    expect(minorToMajor(4500, "jpy")).toBe(4500);
  });

  it("round-trips", () => {
    expect(majorToMinor(minorToMajor(2900, "usd"), "usd")).toBe(2900);
    expect(majorToMinor(minorToMajor(4500, "jpy"), "jpy")).toBe(4500);
    expect(majorToMinor(minorToMajor(19900, "kwd"), "kwd")).toBe(19900);
  });

  it("rounds to a whole minor unit", () => {
    expect(majorToMinor(29.994, "usd")).toBe(2999);
    expect(majorToMinor(4500.6, "jpy")).toBe(4501);
  });
});

describe("convertMinor", () => {
  it("converts between two 2-decimal currencies", () => {
    // $29.00 at 1.3612 CAD per USD
    expect(convertMinor(2900, "usd", "cad", 1.3612)).toBe(3947);
  });

  it("crosses minor-unit boundaries without a 100x error", () => {
    // $29.00 at 155 JPY per USD is ¥4,495 — not ¥449,500.
    expect(convertMinor(2900, "usd", "jpy", 155)).toBe(4495);
  });

  it("converts back out of a zero-decimal currency", () => {
    expect(convertMinor(4495, "jpy", "usd", 1 / 155)).toBe(2900);
  });

  it("is identity at rate 1 within the same currency", () => {
    expect(convertMinor(19900, "usd", "usd", 1)).toBe(19900);
  });
});

describe("formatMoney", () => {
  it("drops decimals on whole amounts, matching the previous USD output", () => {
    expect(formatMoney(2900, "usd", "en-US")).toBe("$29");
    expect(formatMoney(19900, "usd", "en-US")).toBe("$199");
  });

  it("keeps decimals on non-whole amounts", () => {
    expect(formatMoney(2999, "usd", "en-US")).toBe("$29.99");
  });

  it("renders zero-decimal currencies without dividing by 100", () => {
    const formatted = formatMoney(4500, "jpy", "en-US");
    expect(formatted).toContain("4,500");
    expect(formatted).not.toContain("45.00");
  });

  it("distinguishes CAD from USD rather than showing a bare $", () => {
    const cad = formatMoney(3900, "cad", "en-US");
    expect(cad).toContain("39");
    expect(cad).not.toBe("$39");
  });

  it("names an unrecognised but well-formed code instead of guessing a symbol", () => {
    // Intl accepts any three-letter code and renders it literally (with an NBSP),
    // so this stays inside the try branch. It must still never produce a "$".
    const formatted = formatMoney(1234, "zzz").replace(/\u00a0/g, " ");
    expect(formatted).toBe("ZZZ 12.34");
  });

  it("falls back to the ISO code, never a bare $, when Intl throws", () => {
    // Intl throws only on malformed codes. This is the fallback branch.
    expect(formatMoney(1234, "z1")).toBe("Z1 12.34");
    expect(formatMoney(4500, "z1")).toBe("Z1 45.00");
  });

  it("falls back to the default currency on an empty code", () => {
    expect(formatMoney(0, "", "en-US")).toBe("$0");
  });
});

describe("normalizeCurrency", () => {
  it("accepts supported codes in any casing, with whitespace", () => {
    expect(normalizeCurrency("cad")).toBe("cad");
    expect(normalizeCurrency("CAD")).toBe("cad");
    expect(normalizeCurrency("  Cad  ")).toBe("cad");
  });

  it("rejects unsupported and malformed input", () => {
    expect(normalizeCurrency("chf")).toBeNull();
    expect(normalizeCurrency("")).toBeNull();
    expect(normalizeCurrency("us")).toBeNull();
    expect(normalizeCurrency(undefined)).toBeNull();
    expect(normalizeCurrency(null)).toBeNull();
    expect(normalizeCurrency(42)).toBeNull();
    expect(normalizeCurrency({ code: "cad" })).toBeNull();
  });
});

describe("catalog invariants", () => {
  it("includes the default currency", () => {
    expect(isSupportedCurrency(DEFAULT_CURRENCY)).toBe(true);
  });

  it("has unique lowercase codes", () => {
    const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((c) => c === c.toLowerCase())).toBe(true);
  });

  it("exposes metadata for every supported code", () => {
    for (const { code } of SUPPORTED_CURRENCIES) {
      expect(currencyMeta(code)?.code).toBe(code);
    }
    expect(currencyMeta("chf")).toBeNull();
  });

  it("ships exactly one zero-decimal currency so that path stays exercised", () => {
    const zeroDecimal = SUPPORTED_CURRENCIES.filter((c) => ZERO_DECIMAL_CURRENCIES.has(c.code));
    expect(zeroDecimal.map((c) => c.code)).toEqual(["jpy"]);
  });
});
