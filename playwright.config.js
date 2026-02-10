/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  webServer: {
    command: "npm run build && npm run preview",
    port: 4173,
    env: {
      ...process.env,
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET || "test-secret-for-playwright",
      BETTER_AUTH_URL:
        process.env.BETTER_AUTH_URL || "http://localhost:4173",
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "test-client-id",
      GITHUB_CLIENT_SECRET:
        process.env.GITHUB_CLIENT_SECRET || "test-client-secret",
    },
  },
  testDir: "tests",
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
};

export default config;
