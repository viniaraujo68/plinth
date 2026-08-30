import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.{ts,js}",
  // `build` also runs svelte-package, so the end-to-end run exercises the packaged output being
  // published rather than only the showcase sources.
  webServer: { command: "npm run build && npm run preview", port: 4173 },
});
