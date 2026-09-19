import { defineConfig, devices } from "@playwright/test";
import {
  FARE_UPDATE_ANNOUNCEMENT,
  getAnnouncementDismissalKey,
} from "./lib/fare-update-announcement";

const isCI = Boolean(process.env.CI);
const fareAnnouncementDismissalKey = getAnnouncementDismissalKey(
  FARE_UPDATE_ANNOUNCEMENT.id,
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 45_000,
  workers: 1,
  retries: isCI ? 2 : 0,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    // Page-level API mocks cannot intercept requests owned by the PWA worker.
    // Keep fixtures stable across reloads; pwa.spec.ts opts into the real worker.
    serviceWorkers: "block",
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://localhost:3100",
          localStorage: [
            { name: fareAnnouncementDismissalKey, value: "e2e" },
          ],
        },
      ],
    },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: isCI ? "pnpm start --port 3100" : "pnpm dev --port 3100",
    env: { NEXT_E2E: "1" },
    url: "http://localhost:3100",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
