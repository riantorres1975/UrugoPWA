import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3200";
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321/";
const KNOWN_PRODUCTION_PROJECT_REFS = new Set(["nrnlhldtnhexvselctrn"]);

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name} para ejecutar las pruebas administrativas.`);
  return value;
}

const allowWrites = required("ALLOW_TEST_SUPABASE_WRITES");
const supabaseUrl = required("TEST_SUPABASE_URL");
const publishableKey = required("TEST_SUPABASE_PUBLISHABLE_KEY");
const secretKey = required("TEST_SUPABASE_SECRET_KEY");

if (allowWrites !== "1") {
  throw new Error("ALLOW_TEST_SUPABASE_WRITES debe valer 1 para confirmar escrituras temporales.");
}
const parsedSupabaseUrl = new URL(supabaseUrl);
if (parsedSupabaseUrl.href !== LOCAL_SUPABASE_URL) {
  const projectRef = required("TEST_SUPABASE_PROJECT_REF");
  if (KNOWN_PRODUCTION_PROJECT_REFS.has(projectRef)) {
    throw new Error("Las pruebas administrativas no pueden usar el proyecto Supabase de producción.");
  }
  if (!/^[a-z0-9]+$/.test(projectRef) || parsedSupabaseUrl.href !== `https://${projectRef}.supabase.co/`) {
    throw new Error("TEST_SUPABASE_URL no coincide con TEST_SUPABASE_PROJECT_REF.");
  }
}

export default defineConfig({
  testDir: "./e2e-admin",
  fullyParallel: false,
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "admin-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --port 3200",
    env: {
      ADMIN_AUTH_REDIRECT_URL: `${BASE_URL}/auth/callback`,
      ADMIN_EMAILS: "",
      NEXT_E2E: "1",
      NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || "pk.e2e.placeholder",
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      REPORTER_HASH_SECRET: "admin-integration-reporter-secret-2026",
      ROUTE_DATA_SOURCE: "static",
      SUPABASE_SECRET_KEY: secretKey,
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: BASE_URL,
  },
});
