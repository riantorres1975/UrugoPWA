import { expect, test } from "./fixtures";

// These tests exercise installation, cache updates and offline navigation.
test.use({ serviceWorkers: "allow" });

const STATIC_CACHE_PREFIX = "rutas-static-";
const DATA_CACHE = "rutas-data-v1";

async function installServiceWorker(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      });
    }
  });
}

test("instala la PWA, renueva sus cachés y conserva datos de rutas sin conexión", async ({ page, context }) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/");

  await page.evaluate(async () => {
    await caches.open("rutas-static-version-anterior");
    await caches.open("cache-de-otra-aplicacion");
  });

  await installServiceWorker(page);

  await expect.poll(() => page.evaluate(async (prefix) => {
    const keys = await caches.keys();
    return keys.find((key) => key.startsWith(prefix)) ?? null;
  }, STATIC_CACHE_PREFIX)).not.toBeNull();
  const staticCache = await page.evaluate(async (prefix) => {
    const keys = await caches.keys();
    return keys.find((key) => key.startsWith(prefix)) ?? null;
  }, STATIC_CACHE_PREFIX);
  expect(staticCache).not.toBeNull();
  expect(await page.evaluate(() => caches.keys())).toContain("cache-de-otra-aplicacion");
  await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain("rutas-static-version-anterior");

  const shellIsReady = await page.evaluate(async (cacheName) => {
    const cache = await caches.open(cacheName);
    const requiredPages = ["/", "/mapa", "/privacidad", "/offline.html"];
    const matches = await Promise.all(requiredPages.map((url) => cache.match(url)));
    return matches.every(Boolean);
  }, staticCache!);
  expect(shellIsReady).toBe(true);

  await page.goto("/mapa");
  await expect(page.getByRole("heading", { name: "Mapa de rutas de transporte en Uruapan" })).toBeVisible();

  const routeResponse = await page.evaluate(async () => {
    const response = await fetch("/api/rutas-polyline");
    return { ok: response.ok, routes: (await response.json()).length };
  });
  expect(routeResponse.ok).toBe(true);
  expect(routeResponse.routes).toBeGreaterThan(0);

  await expect.poll(async () => page.evaluate(async (cacheName) => {
    const cache = await caches.open(cacheName);
    return Boolean(await cache.match("/api/rutas-polyline"));
  }, DATA_CACHE)).toBe(true);

  await context.setOffline(true);
  try {
    const offlineRouteResponse = await page.evaluate(async () => {
      const response = await fetch("/api/rutas-polyline");
      return {
        ok: response.ok,
        routes: (await response.json()).length,
        source: response.headers.get("X-UruGo-Data-Source"),
      };
    });
    expect(offlineRouteResponse.ok).toBe(true);
    expect(offlineRouteResponse.routes).toBe(routeResponse.routes);
    expect(offlineRouteResponse.source).toBe("cache");

    await page.goto("/mapa?origen=offline", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Mapa de rutas de transporte en Uruapan" })).toBeVisible();

    await page.goto("/pagina-no-guardada", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test("usa la caché rápido con red lenta y la renueva en segundo plano", async ({ page, context }) => {
  await page.goto("/");
  await installServiceWorker(page);

  const routePayload = await page.evaluate(async () => {
    const response = await fetch("/api/rutas-polyline");
    return response.json();
  });
  const stalePayload = routePayload.map((route: object, index: number) =>
    index === 0 ? { ...route, cacheVersion: "stale" } : route
  );
  const freshPayload = routePayload.map((route: object, index: number) =>
    index === 0 ? { ...route, cacheVersion: "fresh" } : route
  );

  await page.evaluate(async ({ cacheName, payload }) => {
    const cache = await caches.open(cacheName);
    await cache.put(
      "/api/rutas-polyline",
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }, { cacheName: DATA_CACHE, payload: stalePayload });

  await context.route("**/api/rutas-polyline", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(freshPayload),
    });
  });

  const cachedResponse = await page.evaluate(async () => {
    const startedAt = performance.now();
    const response = await fetch("/api/rutas-polyline");
    const routes = await response.json();
    return {
      elapsedMs: performance.now() - startedAt,
      cacheVersion: routes[0]?.cacheVersion,
      source: response.headers.get("X-UruGo-Data-Source"),
    };
  });

  expect(cachedResponse.source).toBe("cache");
  expect(cachedResponse.cacheVersion).toBe("stale");
  expect(cachedResponse.elapsedMs).toBeLessThan(2500);

  await page.goto("/mapa?origen=red-lenta");
  await expect(page.getByRole("status", { name: "Estado de datos de rutas" }))
    .toContainText("Usando rutas guardadas", { timeout: 7000 });

  await expect.poll(async () => page.evaluate(async (cacheName) => {
    const cache = await caches.open(cacheName);
    const response = await cache.match("/api/rutas-polyline");
    const routes = response ? await response.json() : [];
    return routes[0]?.cacheVersion;
  }, DATA_CACHE), { timeout: 8000 }).toBe("fresh");
});
