import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const ACCESS_CODE_KEY = "zenvi_access_code";
export const CHECKOUT_ACCESS_CODE_KEY = "zenvi_checkout_access_code";

interface AccessCodeFormProps {
  onValidated: (code: string, allowedTier?: string | null) => void;
  compact?: boolean;
  /** sessionStorage key; checkout uses a separate key from the landing/download flow */
  storageKey?: string;
  /** Selected plan tier; parent clamps checkout if invite allows a lower max tier */
  planTier?: string;
}

export default function AccessCodeForm({
  onValidated,
  compact,
  storageKey = ACCESS_CODE_KEY,
}: AccessCodeFormProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc("validate_waitlist_token", {
        token: trimmed,
      });

      if (rpcError || !data || data.length === 0) {
        setError("Invalid or already used access code. Check your invite and try again.");
        return;
      }

      const allowedTier = (data[0]?.allowed_tier as string | null) ?? null;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: claimed, error: claimError } = await supabase.rpc("claim_waitlist_token", {
          token: trimmed,
        });
        if (claimError || !claimed) {
          setError("This access code is not valid for your account.");
          return;
        }
      }

      sessionStorage.setItem(storageKey, trimmed);
      onValidated(trimmed, allowedTier);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-3" : "space-y-3"}>
      <Input
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError("");
        }}
        required
        autoFocus
        className="h-11 bg-white/[0.03] border-white/[0.06] focus:border-primary text-white placeholder:text-muted-foreground/50 font-mono text-sm"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={isLoading || !code.trim()}
        className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}
