import { defineConfig, devices } from "@playwright/test";

// Scoped to ./tests so the stale root-level test-site.spec.ts (which points at the
// old peoples-chamber-frontend.vercel.app domain) is not picked up. The Humaniser specs
// that lived there were removed with the Humaniser (owner, 15 Nov 2026, COWORK-TO-T1 ENTRY 131).
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
