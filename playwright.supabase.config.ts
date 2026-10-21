import { defineConfig, devices } from "@playwright/test";

/**
 * E2E mode Supabase (MFA) dengan Supabase ditiru di jaringan browser.
 * Jalankan: npm run test:e2e:supabase (membangun ke .next-supabase lebih dulu).
 */
const PORT = Number(process.env.E2E_SUPABASE_PORT ?? 3300);
export const SUPABASE_E2E_ENV = {
  APP_DATA_MODE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://proyek-uji.supabase.co",
  // Placeholder publishable key (bukan key sungguhan).
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_placeholder_e2e",
  NEXT_DIST_DIR: ".next-supabase",
};

export default defineConfig({
  testDir: "./e2e",
  testMatch: "mfa.spec.ts",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
  webServer: {
    command: `npx next start -p ${PORT}`,
    env: SUPABASE_E2E_ENV,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
