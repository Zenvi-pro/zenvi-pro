import type { Session } from "@supabase/supabase-js";
import type { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** Hand tokens to the desktop poll bridge and show the success page. */
export async function completeDesktopAuth(
  state: string,
  session: Pick<Session, "access_token" | "refresh_token">,
  navigate: NavigateFunction,
): Promise<void> {
  const { error } = await supabase.rpc("complete_desktop_auth_session", {
    session_state: state,
    p_access_token: session.access_token,
    p_refresh_token: session.refresh_token,
  });
  if (error) throw error;
  navigate("/auth/success", { replace: true });
}
