/**
 * Resolusi mode data per deployment (dipakai next.config.ts dan src/lib/config.ts).
 *
 * Urutan:
 *   1. Variabel lingkungan eksplisit (APP_DATA_MODE, NEXT_PUBLIC_SUPABASE_*) selalu menang.
 *   2. Deployment Vercel PREVIEW dari branch yang terdaftar di preview-supabase.json memakai
 *      proyek Supabase uji yang tercantum di sana (nilai publik saja).
 *   3. Selain itu: mode dummy (termasuk Production bila tidak dikonfigurasi).
 * Production (VERCEL_ENV=production) tidak pernah memakai konfigurasi preview.
 */
// Modul CommonJS agar dapat dimuat next.config.ts (resolusi modulnya CommonJS).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const preview = require("./preview-supabase.json");

/** @param {Record<string, string | undefined>} env */
function resolveDataEnv(env, cfg = preview) {
  if ((env.APP_DATA_MODE || "").trim()) return env;
  const branch = env.VERCEL_GIT_COMMIT_REF;
  if (env.VERCEL_ENV === "preview" && branch && cfg.branches.includes(branch) && cfg.supabaseUrl && cfg.supabaseAnonKey) {
    return { ...env, APP_DATA_MODE: "supabase", NEXT_PUBLIC_SUPABASE_URL: cfg.supabaseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: cfg.supabaseAnonKey };
  }
  return env;
}

module.exports = { resolveDataEnv, preview };
