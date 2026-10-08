/**
 * Akun demo untuk mode dummy. Ini SIMULASI login di browser untuk membedakan
 * tampilan DR dan KPw — bukan kontrol keamanan: kredensial sengaja publik dan
 * diperiksa di sisi klien. Keamanan sesungguhnya ada di mode Supabase (Auth + RLS).
 */
import type { Unit, Viewer } from "./types";

export const DEMO_EMAIL_DOMAIN = "sekar.demo";

export const DEMO_PASSWORDS = {
  dr: "SekarDR#2026",
  kpw: "SekarKPw#2026",
  admin: "SekarAdmin#2026",
} as const;

export interface DemoAccountInfo {
  email: string;
  password: string;
  label: string;
  description: string;
}

/** Email akun KPw dari id unit, mis. kpw-05 → kpw05@sekar.demo. */
export function kpwEmail(unitId: string): string {
  return `${unitId.replace("-", "")}@${DEMO_EMAIL_DOMAIN}`;
}

/** Akun yang ditampilkan di halaman login sebagai contoh. */
export const FEATURED_ACCOUNTS: DemoAccountInfo[] = [
  { email: `dr@${DEMO_EMAIL_DOMAIN}`, password: DEMO_PASSWORDS.dr, label: "Departemen Regional", description: "Super koordinator · seluruh KPwDN" },
  { email: kpwEmail("kpw-01"), password: DEMO_PASSWORDS.kpw, label: "KPw Simulasi 01", description: "Hanya data KPw sendiri" },
  { email: `admin@${DEMO_EMAIL_DOMAIN}`, password: DEMO_PASSWORDS.admin, label: "Admin", description: "Kelola dataset demo" },
];

/** Viewer untuk email demo (tanpa memeriksa kata sandi) — dipakai memulihkan sesi tersimpan. */
export function viewerForDemoEmail(email: string, units: Pick<Unit, "id" | "name">[]): Viewer | null {
  const e = email.trim().toLowerCase();
  if (e === `dr@${DEMO_EMAIL_DOMAIN}`) return { id: "demo-dr", name: "Departemen Regional", role: "dr", unit_id: "dr", simulated: true };
  if (e === `admin@${DEMO_EMAIL_DOMAIN}`) return { id: "demo-admin", name: "Admin SEKAR", role: "admin", unit_id: "dr", simulated: true };
  const m = /^kpw(\d{2})@sekar\.demo$/.exec(e);
  if (!m) return null;
  const unit = units.find((u) => u.id === `kpw-${m[1]}`);
  return unit ? { id: `demo-${unit.id}`, name: unit.name, role: "kpw", unit_id: unit.id, simulated: true } : null;
}

/** Memeriksa email + kata sandi demo. Mengembalikan viewer atau pesan galat. */
export function signInDemo(email: string, password: string, units: Pick<Unit, "id" | "name">[]): Viewer | string {
  const viewer = viewerForDemoEmail(email, units);
  if (!viewer) return "Email tidak terdaftar sebagai akun demo.";
  if (password !== DEMO_PASSWORDS[viewer.role]) return "Kata sandi salah.";
  return viewer;
}
