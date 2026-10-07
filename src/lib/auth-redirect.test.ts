import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));

import {
  clearRecoverySession,
  goToPostLoginPath,
  isExternalAppPath,
  isRecoverySession,
  markRecoverySession,
  safeNextPath,
} from "./auth-redirect";

describe("post-login destinations", () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("window", { location: { origin: "https://zenvi.pro", replace } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    replace.mockReset();
  });

  it("keeps same-origin paths with their query and hash", () => {
    expect(safeNextPath("/editor/p/c_123?tab=files#x")).toBe("/editor/p/c_123?tab=files#x");
    expect(safeNextPath("/checkout?plan=pro_monthly")).toBe("/checkout?plan=pro_monthly");
  });

  it("rejects anything that could leave the site", () => {
    expect(safeNextPath("https://evil.example/editor")).toBeNull();
    expect(safeNextPath("//evil.example/editor")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("editor")).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });

  it("recognizes the web editor as another app", () => {
    expect(isExternalAppPath("/editor")).toBe(true);
    expect(isExternalAppPath("/editor/")).toBe(true);
    expect(isExternalAppPath("/editor/p/abc")).toBe(true);
    expect(isExternalAppPath("/editor?x=1")).toBe(true);
    expect(isExternalAppPath("/editor#timeline")).toBe(true);
    expect(isExternalAppPath("/editorial")).toBe(false);
    expect(isExternalAppPath("/download")).toBe(false);
  });

  it("uses a full page load only for other apps", () => {
    const navigate = vi.fn();
    goToPostLoginPath("/editor/p/abc", navigate);
    expect(replace).toHaveBeenCalledWith("/editor/p/abc");
    expect(navigate).not.toHaveBeenCalled();

    goToPostLoginPath("/download", navigate);
    expect(navigate).toHaveBeenCalledWith("/download", { replace: true });
  });
});

describe("recovery session marker", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("only unlocks the user whose recovery link was verified", () => {
    expect(isRecoverySession("user-a")).toBe(false);
    markRecoverySession("user-a");
    expect(isRecoverySession("user-a")).toBe(true);
    expect(isRecoverySession("user-b")).toBe(false);
  });

  it("is cleared after the reset completes", () => {
    markRecoverySession("user-a");
    clearRecoverySession();
    expect(isRecoverySession("user-a")).toBe(false);
  });

  it("fails closed when storage throws", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => markRecoverySession("user-a")).not.toThrow();
    expect(isRecoverySession("user-a")).toBe(false);
    expect(() => clearRecoverySession()).not.toThrow();
  });
});
