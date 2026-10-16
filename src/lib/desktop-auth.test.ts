import { describe, expect, it, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const navigate = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

describe("completeDesktopAuth", () => {
  beforeEach(() => {
    rpc.mockReset();
    navigate.mockReset();
  });

  it("calls the desktop auth RPC then navigates to success", async () => {
    rpc.mockResolvedValue({ error: null });
    const { completeDesktopAuth } = await import("./desktop-auth");

    await completeDesktopAuth(
      "state-123",
      { access_token: "access", refresh_token: "refresh" },
      navigate,
    );

    expect(rpc).toHaveBeenCalledWith("complete_desktop_auth_session", {
      session_state: "state-123",
      p_access_token: "access",
      p_refresh_token: "refresh",
    });
    expect(navigate).toHaveBeenCalledWith("/auth/success", { replace: true });
  });

  it("does not navigate when the RPC fails", async () => {
    rpc.mockResolvedValue({ error: new Error("rpc failed") });
    const { completeDesktopAuth } = await import("./desktop-auth");

    await expect(
      completeDesktopAuth(
        "state-123",
        { access_token: "access", refresh_token: "refresh" },
        navigate,
      ),
    ).rejects.toThrow("rpc failed");

    expect(navigate).not.toHaveBeenCalled();
  });
});
