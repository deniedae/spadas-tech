import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Native tsconfig path alias resolution (resolves @/* → src/*)
    // Vite 5+ supports this without a plugin.
    tsconfigPaths: true,
  } as any,
  test: {
    // Run in Node (no JSDOM needed for pure-math libs)
    environment: "node",
    // Colour the output and show per-test timings
    reporter: "verbose",
    // Only pick up files under src/lib/__tests__ to avoid touching Next route files
    include: ["src/lib/__tests__/**/*.test.ts"],
  },
});
