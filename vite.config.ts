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
  },
});
