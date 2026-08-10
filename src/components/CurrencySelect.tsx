import { currencyMeta } from "@shared/currency.ts";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

/**
 * Currency picker.
 *
 * `options` comes from the pricing payload, so it lists only currencies the tiers can
 * genuinely be billed in. When a subscription pins the currency the control renders
 * read-only rather than offering a change Stripe would refuse.
 */
export default function CurrencySelect({
  options,
  className,
}: {
  options: string[];
  className?: string;
}) {
  const { currency, setCurrency, locked, lockedReason } = useCurrency();

  if (options.length <= 1) return null;

  const base = "rounded-lg border border-white/[0.08] bg-[#111111] px-3 py-2 text-xs text-white/70";

  if (locked) {
    return (
      <div className={cn(base, "cursor-not-allowed opacity-60", className)} title={lockedReason ?? undefined}>
        {currencyMeta(currency)?.label ?? currency.toUpperCase()}
      </div>
    );
  }

  return (
    <label className={cn("inline-flex items-center gap-2", className)}>
      <span className="sr-only">Display currency</span>
      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value)}
        className={cn(base, "cursor-pointer outline-none focus:border-primary/60")}
      >
        {options.map((code) => {
          const meta = currencyMeta(code);
          return (
            <option key={code} value={code} className="bg-[#111111]">
              {meta ? `${meta.label} · ${meta.name}` : code.toUpperCase()}
            </option>
          );
        })}
      </select>
    </label>
  );
}
