import { defineConfig } from "@playwright/test";
export default defineConfig({
  outputDir: "test-results/mock",
  testDir: "./tests/e2e",
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 960 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_ENABLE_MOCK: "true",
      BACKEND_ENABLED: "false",
      NEXT_DIST_DIR: ".next/mock-e2e",
    },
  },
  reporter: [["list"]],
});
