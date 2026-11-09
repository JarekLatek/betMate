import { defineConfig, devices } from "@playwright/test";
import { config } from "@dotenvx/dotenvx";
import path from "path";

// Załaduj (i odszyfruj kluczem z .env.keys) zmienne środowiskowe z .env.test.
// W CI .env.test jest tworzony jawnym tekstem z sekretów GitHuba — też działa.
config({ path: path.resolve(process.cwd(), ".env.test"), quiet: true });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ?? "",
      SUPABASE_KEY: process.env.SUPABASE_KEY ?? "",
      PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL ?? "",
      PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
  },
});
