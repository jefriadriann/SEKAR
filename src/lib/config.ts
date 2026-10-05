import type { DataMode } from "./repository/types";

export interface AppConfig {
  mode: DataMode;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  /** Diisi bila konfigurasi tidak valid. Aplikasi menampilkan error, tidak fallback ke dummy. */
  configError?: string;
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
    return {
      mode: "supabase",
      supabaseUrl,
      supabaseAnonKey,
      configError: missing.length ? `APP_DATA_MODE=supabase, tetapi variabel berikut belum diisi: ${missing.join(", ")}.` : undefined,
    };
  }
  return { mode: "dummy", configError: `Nilai APP_DATA_MODE tidak dikenal: "${raw}". Gunakan "dummy" atau "supabase".` };
}
