import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, invoke, verifyOtp } = vi.hoisted(() => ({
  rpc: vi.fn(),
  invoke: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc, functions: { invoke }, auth: {} },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { verifyOtp } }),
}));

import { completeDesktopSignIn, confirmationCode, withTimeout } from "./desktop-handoff";

const browser = {
  access_token: "browser-access",
  refresh_token: "browser-refresh",
  user: { id: "user-1" },
} as never;

describe("handing a sign-in to the Zenvi desktop app", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: true, error: null });
    invoke.mockReset();
    verifyOtp.mockReset();
  });

  it("gives the app a session of its own, never this browser's", async () => {
    invoke.mockResolvedValue({ data: { token_hash: "hash" }, error: null });
    verifyOtp.mockResolvedValue({
      data: { session: { access_token: "desktop-access", refresh_token: "desktop-refresh", user: { id: "user-1" } } },
      error: null,
    });

    expect(await completeDesktopSignIn("state-1", browser)).toBe(true);
    expect(invoke).toHaveBeenCalledWith("desktop-session-link", { body: { state: "state-1" } });
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "hash", type: "magiclink" });
    expect(rpc).toHaveBeenCalledWith("complete_desktop_auth_session", {
      session_state: "state-1",
      p_access_token: "desktop-access",
      p_refresh_token: "desktop-refresh",
    });
  });

  it("still signs the app in when no separate session can be made", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("function not deployed") });

    expect(await completeDesktopSignIn("state-1", browser)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("complete_desktop_auth_session", {
      session_state: "state-1",
      p_access_token: "browser-access",
      p_refresh_token: "browser-refresh",
    });
  });

  it("never hands over a session for someone else", async () => {
    invoke.mockResolvedValue({ data: { token_hash: "hash" }, error: null });
    verifyOtp.mockResolvedValue({
      data: { session: { access_token: "x", refresh_token: "y", user: { id: "someone-else" } } },
      error: null,
    });

    await completeDesktopSignIn("state-1", browser);
    expect(rpc.mock.calls[0][1].p_access_token).toBe("browser-access");
  });

  it("reports a hand-off the database refused", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("x") });
    rpc.mockResolvedValue({ data: null, error: { message: "permission denied" } });

    expect(await completeDesktopSignIn("state-1", browser)).toBe(false);
  });
});

describe("the confirmation code", () => {
  it("matches the Zenvi app's (classes/auth_manager.py confirmation_code)", async () => {
    expect(await confirmationCode("00000000-0000-4000-8000-000000000000")).toBe("5QA-FM2");
    expect(await confirmationCode("3f2b8c1e-9d4a-4e7b-a1c2-5d6e7f8a9b0c")).toBe("UPJ-EH3");
  });
});

describe("checking for a signed-in account", () => {
  it("gives up after the timeout instead of spinning forever", async () => {
    vi.useFakeTimers();
    const never = new Promise<string | null>(() => undefined);
    const result = withTimeout(never, 4000, null);
    await vi.advanceTimersByTimeAsync(4000);
    expect(await result).toBeNull();
    vi.useRealTimers();
  });
});
