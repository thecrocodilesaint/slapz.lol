const path = require("path");
const { defineConfig } = require("@playwright/test");

const port = process.env.PLAYWRIGHT_PORT || "4181";
const baseURL = `http://127.0.0.1:${port}`;
const testDataDir = process.env.FUNLOL_TEST_DATA_DIR || path.join(__dirname, ".test-data");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node server.js",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      PORT: port,
      FUNLOL_DATA_DIR: testDataDir,
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
