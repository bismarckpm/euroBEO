import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { isolatedDatabaseUrl } from "./e2e/isolated-database";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = isolatedDatabaseUrl(process.env.DATABASE_URL);
}

const webServerEnv: Record<string, string> = { NODE_ENV: "development" };
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) webServerEnv[key] = value;
}
webServerEnv.NODE_ENV = "development";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: webServerEnv,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
