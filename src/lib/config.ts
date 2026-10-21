import type { DataMode } from "./repository/types";

export interface AppConfig {
  mode: DataMode;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  /** Diisi bila konfigurasi tidak valid. Aplikasi menampilkan error, tidak fallback ke dummy. */
  configError?: string;
}

/** Nama variabel publik (terkirim ke browser) yang tidak boleh memuat secret. */
const SECRET_NAME = /SERVICE_ROLE|SECRET|PRIVATE|PASSWORD/i;

function jwtRole(key: string): string | null {
  const part = key.split(".")[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

/**
 * Key yang hanya boleh dipakai di server (service_role / secret key) tidak boleh
 * menjadi "anon key" publik. Mengembalikan pesan error, atau null bila aman.
 * Nilai key tidak pernah disertakan dalam pesan.
 */
export function privilegedKeyProblem(env: Record<string, string | undefined>): string | null {
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (key.startsWith("sb_secret_") || jwtRole(key) === "service_role")
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY berisi secret/service-role key. Gunakan publishable/anon key, lalu cabut (rotate) key yang terlanjur dipakai.";
  const leaked = Object.keys(env).filter((k) => k.startsWith("NEXT_PUBLIC_") && SECRET_NAME.test(k));
  if (leaked.length) return `Variabel publik tidak boleh memuat secret: ${leaked.join(", ")}. Pindahkan ke variabel server tanpa awalan NEXT_PUBLIC_.`;
  return null;
}

/**
 * Dibaca di server (root layout). APP_DATA_MODE default "dummy".
 * Hanya URL & anon key publik yang diteruskan ke browser.
 */
export function readAppConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const raw = (env.APP_DATA_MODE ?? "dummy").trim().toLowerCase() || "dummy";
  if (raw === "dummy") return { mode: "dummy" };
  if (raw === "supabase") {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const missing = [!supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL", !supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter(Boolean);
    const privileged = privilegedKeyProblem(env);
    if (privileged) return { mode: "supabase", configError: privileged };
    if (supabaseUrl && !/^https:\/\//.test(supabaseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(supabaseUrl))
      return { mode: "supabase", configError: "NEXT_PUBLIC_SUPABASE_URL harus memakai https://." };
    return {
      mode: "supabase",
      supabaseUrl,
      supabaseAnonKey,
      configError: missing.length ? `APP_DATA_MODE=supabase, tetapi variabel berikut belum diisi: ${missing.join(", ")}.` : undefined,
    };
  }
  return { mode: "dummy", configError: `Nilai APP_DATA_MODE tidak dikenal: "${raw}". Gunakan "dummy" atau "supabase".` };
}
