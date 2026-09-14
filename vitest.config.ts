import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "supabase/functions/**/*.test.ts"],
    // `**/._*` excludes macOS AppleDouble sidecar files that some volumes
    // (e.g. SMB/Synology) create next to source files and which break esbuild.
    exclude: ["node_modules", "dist", "e2e/**", "**/._*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules",
        "src/components/ui/**",
        "src/db/database.types.ts",
        "**/*.config.*",
        "**/*.d.ts",
        // powłoka handlera + ingest (ryzyko #2) poza zakresem pokrycia; scoring i mapowanie
        // mierzone w wydzielonych modułach
        "supabase/functions/sync-matches/index.ts",
      ],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 80,
        statements: 70,
      },
    },
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
