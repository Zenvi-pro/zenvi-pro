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

import { completeDesktopSignIn } from "./desktop-handoff";

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
