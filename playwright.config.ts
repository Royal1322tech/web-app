import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
          command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
          url: "http://127.0.0.1:4173",
          reuseExistingServer: false,
          timeout: 120000,
          // Browser checks exercise the developer-only interface state previews.
          // The demo build stays in demo mode even though .env.production enables real sign-in.
          env: { VITE_ENABLE_STATE_PREVIEW: "true", VITE_AUTH_MODE: "demo", VITE_AUTH_COMPANY_ID_ENTRY: "", VITE_HOTEL_SEARCH_MODE: "" },
        },
        // Real-sign-in builds for tests/auth-integration.spec.ts. The API base is a reserved test
        // domain that never resolves, and every request to it is answered by the test's mocks.
        ...[
          { port: 4174, outDir: "dist-auth-api", companyIdEntry: "true" },
          { port: 4175, outDir: "dist-auth-blocked", companyIdEntry: "" },
          // tests/b2b-hotel-search.spec.ts: real sign-in plus the company (B2B) hotel search.
          { port: 4176, outDir: "dist-hotel-api", companyIdEntry: "true", hotelSearch: "api" },
        ].map(({ port, outDir, companyIdEntry, hotelSearch = "" }) => ({
          command: `npx vite build --outDir ${outDir} --emptyOutDir && npx vite preview --outDir ${outDir} --host 127.0.0.1 --port ${port} --strictPort`,
          url: `http://127.0.0.1:${port}`,
          reuseExistingServer: false,
          timeout: 120000,
          env: { VITE_AUTH_MODE: "api", VITE_AUTH_COMPANY_ID_ENTRY: companyIdEntry, VITE_HOTEL_SEARCH_MODE: hotelSearch, VITE_API_BASE_URL: "https://api.royal.test" },
        })),
      ],
});
