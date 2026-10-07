import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthRedirect, goToPostLoginPath, markRecoverySession, resolvePostLoginPath } from "@/lib/auth-redirect";

// Landing page for OAuth redirects (GitHub, Google).
// Supabase exchanges the auth code for a session when this page loads.
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const isRecovery =
      searchParams.get("type") === "recovery" ||
      new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";

    const goToReset = () => {
      const reset = new URL("/reset-password", window.location.origin);
      const desktopState = searchParams.get("state");
      if (desktopState) reset.searchParams.set("state", desktopState);
      navigate(`${reset.pathname}${reset.search}${window.location.hash}`, { replace: true });
    };

    let handled = false;

    // A callback whose code exchange fails never emits SIGNED_IN / PASSWORD_RECOVERY.
    const fallback = window.setTimeout(() => {
      if (handled) return;
      handled = true;
      subscription.unsubscribe();
      navigate("/login", { replace: true });
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (handled) return;

      if (event === "PASSWORD_RECOVERY" || (session && isRecovery)) {
        handled = true;
        subscription.unsubscribe();
        window.clearTimeout(fallback);
        if (session) markRecoverySession(session.user.id);
        goToReset();
        return;
      }

      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        await new Promise((resolve) => window.setTimeout(resolve, 150));
        if (handled) return;
        handled = true;
        subscription.unsubscribe();
        window.clearTimeout(fallback);
        const { next, state: desktopState } = consumeAuthRedirect(searchParams);

        if (desktopState) {
          await supabase.rpc("complete_desktop_auth_session", {
            session_state: desktopState,
            p_access_token: session.access_token,
            p_refresh_token: session.refresh_token,
          });
          navigate("/auth/success", { replace: true });
        } else {
          const dest = await resolvePostLoginPath(next);
          goToPostLoginPath(dest, navigate);
        }
      } else if (event === "INITIAL_SESSION" && !session) {
        if (searchParams.get("code") || window.location.hash.includes("access_token")) {
          return;
        }
        handled = true;
        subscription.unsubscribe();
        window.clearTimeout(fallback);
        navigate("/", { replace: true });
      }
    });

    return () => {
      window.clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </div>
  );
}
