import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://localhost:3001",
    channel: "msedge",
    headless: true,
    viewport: {
      width: 1440,
      height: 1000,
    },
  },
});
