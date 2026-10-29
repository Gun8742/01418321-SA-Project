import "dotenv/config";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  outputDir: "test-results/backend",
  testDir: "./tests/backend-e2e",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3187",
    viewport: { width: 1440, height: 960 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3187",
    url: "http://127.0.0.1:3187/login",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      BACKEND_ENABLED: "true",
      CASE_POLICY_VERSION: "INTERNAL-1",
      EXTERNAL_RESULTS_BY_EMPLOYER: "true",
      NEXT_PUBLIC_ENABLE_MOCK: "false",
      NEXT_DIST_DIR: ".next/backend-e2e",
      BETTER_AUTH_URL: "http://127.0.0.1:3187",
    },
  },
  reporter: [["list"]],
});
