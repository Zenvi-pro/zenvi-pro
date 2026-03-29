import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Landing page for OAuth redirects (GitHub, Google). 
// Supabase automatically exchanges the auth code for a session when this page loads.
// We listen for the session, then forward to wherever the user was going.
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const getNext = () => {
      const n = sessionStorage.getItem("auth_next");
      sessionStorage.removeItem("auth_next");
      return n ?? "/";
    };

    const getState = () => {
      const s = sessionStorage.getItem("auth_state");
      sessionStorage.removeItem("auth_state");
      return s;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        subscription.unsubscribe();
        const desktopState = getState();
        if (desktopState) {
          await supabase.rpc("complete_desktop_auth_session", {
            session_state: desktopState,
            p_access_token: session.access_token,
            p_refresh_token: session.refresh_token,
          });
          navigate("/auth/success", { replace: true });
        } else {
          navigate(getNext(), { replace: true });
        }
      } else if (event === "INITIAL_SESSION" && !session) {
        // OAuth exchange produced no session — go home
        subscription.unsubscribe();
        navigate("/", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </div>
  );
}
