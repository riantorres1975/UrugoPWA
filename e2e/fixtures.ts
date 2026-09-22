import { expect, test as base } from "@playwright/test";
import { isKnownMapboxWorkerError } from "./browser-errors";

type BrowserErrorFixtures = {
  browserErrors: void;
};

export const test = base.extend<BrowserErrorFixtures>({
  browserErrors: [async ({ page }, use) => {
    const unexpectedErrors: Error[] = [];
    const recordPageError = (error: Error) => {
      if (!isKnownMapboxWorkerError(error)) unexpectedErrors.push(error);
    };

    page.on("pageerror", recordPageError);
    // General UI tests must not spend Directions quota or depend on live opinions.
    // Walking-specific tests replace these handlers with deterministic provider fixtures.
    await page.route("https://api.mapbox.com/directions/v5/mapbox/walking/**", (route) => route.fulfill({ status: 503, json: {} }));
    await page.route("**/api/community/journey-quality", (route) => route.fulfill({ json: { signals: [] } }));
    await page.route("**/api/analytics/trip-activity", (route) => route.fulfill({ status: 204 }));
    await use();
    page.off("pageerror", recordPageError);

    expect(
      unexpectedErrors.map((error) => error.stack ?? error.message),
      "La página emitió errores inesperados durante la prueba",
    ).toEqual([]);
  }, { auto: true }],
});

export { expect };
