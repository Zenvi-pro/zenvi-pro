// `vitest/config` re-exports Vite's defineConfig and adds typing for the `test` block.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Code shared with the Deno edge functions. Only import modules from here
      // that are free of remote imports — see supabase/functions/_shared/currency.ts.
      "@shared": path.resolve(__dirname, "./supabase/functions/_shared"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/*.test.{ts,tsx}",
      "supabase/functions/_shared/**/*.test.ts",
    ],
    setupFiles: ["./src/test/setup.ts"],
    alias: {
      // The edge functions import Deno-resolvable URL specifiers. Stub them so the
      // pure helpers in _shared can be unit tested without a network fetch.
      "https://esm.sh/stripe@14.21.0": path.resolve(__dirname, "./src/test/stubs/stripe.ts"),
    },
  },
});
