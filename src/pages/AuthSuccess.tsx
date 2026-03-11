import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

/**
 * Shown after the user authenticates in the browser as part of the desktop app
 * OAuth-style flow. The desktop app is polling in the background and will detect
 * the completed session automatically — no action needed from the user.
 */
export default function AuthSuccessPage() {
  const [countdown, setCountdown] = useState(5);

  // Attempt to close the tab after a short delay (works when opened via window.open)
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          // Try to close — only works if the tab was script-opened
          try {
            window.close();
          } catch {
            // Ignore — browser may block this; user can close manually
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm text-center"
      >
        {/* Wordmark */}
        <div className="mb-10">
          <Link
            to="/"
            className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity"
          >
            Zenvi
          </Link>
        </div>

        {/* Success icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-20 h-20 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mx-auto mb-7"
        >
          <CheckCircle className="w-9 h-9 text-primary" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <h1 className="text-2xl font-semibold text-white mb-3 tracking-tight">
            You're signed in
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Authentication complete. Zenvi has been notified — you can return to
            the app now.
          </p>

          {/* Auto-close hint */}
          <div className="rounded-lg border border-white/[0.06] bg-[#111111] px-5 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              {countdown > 0 ? (
                <>
                  This tab will close in{" "}
                  <span className="text-white font-medium tabular-nums">
                    {countdown}s
                  </span>
                </>
              ) : (
                <span className="text-white">
                  You can close this tab and return to Zenvi.
                </span>
              )}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
