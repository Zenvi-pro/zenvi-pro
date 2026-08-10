import { useContext } from "react";
import { CurrencyContext } from "@/contexts/currency-context";

export function useCurrency() {
  return useContext(CurrencyContext);
}
