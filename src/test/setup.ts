/**
 * Vitest setup.
 *
 * The `_shared` modules are written for Deno and read configuration via `Deno.env`.
 * Back that onto `process.env` so those files can be unit tested under Node without
 * adding runtime guards to production code.
 */
if (!(globalThis as Record<string, unknown>).Deno) {
  (globalThis as Record<string, unknown>).Deno = {
    env: {
      get: (key: string) => process.env[key],
      set: (key: string, value: string) => {
        process.env[key] = value;
      },
      delete: (key: string) => {
        delete process.env[key];
      },
      toObject: () => ({ ...process.env }),
    },
  };
}
