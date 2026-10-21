/**
 * Alur MFA (TOTP) di atas API resmi Supabase Auth (`supabase.auth.mfa`).
 * Tidak ada kriptografi buatan sendiri: secret, QR, challenge, dan verifikasi
 * seluruhnya ditangani Supabase Auth. Modul ini hanya mengatur urutan langkah
 * dan aturan aplikasi:
 *   - MFA WAJIB untuk semua peran (seluruh data aplikasi bersifat terlindungi).
 *   - Menghapus faktor memerlukan verifikasi ulang kode (step-up) dan tidak
 *     boleh menghapus faktor terakhir — ganti faktor = tambah baru lalu hapus lama.
 * Penegakan sesungguhnya ada di server: RLS menolak JWT tanpa aal2
 * (supabase/migrations/0003) dan API signed-url memeriksa klaim aal.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type MfaApi = Pick<
  SupabaseClient["auth"]["mfa"],
  "listFactors" | "getAuthenticatorAssuranceLevel" | "enroll" | "challenge" | "verify" | "challengeAndVerify" | "unenroll"
>;

export interface TotpFactor {
  id: string;
  friendly_name?: string;
  status: string;
  created_at?: string;
}

export type MfaGate = { kind: "ok" } | { kind: "enroll" } | { kind: "challenge"; factors: TotpFactor[] };

export const TOTP_CODE = /^\d{6}$/;
export const isTotpCode = (code: string) => TOTP_CODE.test(code.trim());

/** Keputusan murni: sesi aal2 → ok; punya faktor terverifikasi → challenge; selain itu wajib daftar. */
export function decideMfaGate(currentLevel: string | null | undefined, verified: TotpFactor[]): MfaGate {
  if (currentLevel === "aal2") return { kind: "ok" };
  if (verified.length) return { kind: "challenge", factors: verified };
  return { kind: "enroll" };
}

function fail(error: { message?: string } | null | undefined, fallback: string): never {
  throw new Error(error?.message || fallback);
}

export async function listTotpFactors(api: MfaApi): Promise<{ verified: TotpFactor[]; all: TotpFactor[] }> {
  const { data, error } = await api.listFactors();
  if (error || !data) fail(error, "Gagal membaca faktor MFA.");
  const all = (data.all ?? []).filter((f) => f.factor_type === "totp") as TotpFactor[];
  return { all, verified: all.filter((f) => f.status === "verified") };
}

export async function readMfaGate(api: MfaApi): Promise<MfaGate> {
  const { data, error } = await api.getAuthenticatorAssuranceLevel();
  if (error || !data) fail(error, "Gagal membaca tingkat autentikasi.");
  if (data.currentLevel === "aal2") return { kind: "ok" };
  const { verified } = await listTotpFactors(api);
  return decideMfaGate(data.currentLevel, verified);
}

export interface TotpEnrollment {
  factorId: string;
  /** SVG data URL dari Supabase; hanya untuk ditampilkan, jangan dicatat ke log. */
  qrCode: string;
  /** Kunci manual bila QR tidak dapat dipindai; hanya ditampilkan atas permintaan pengguna. */
  secret: string;
}

/** Mulai pendaftaran TOTP. Faktor lama yang belum terverifikasi dibersihkan agar tidak menumpuk. */
export async function beginTotpEnrollment(api: MfaApi, friendlyName: string): Promise<TotpEnrollment> {
  const { all } = await listTotpFactors(api);
  for (const f of all.filter((x) => x.status !== "verified")) await api.unenroll({ factorId: f.id });
  const name = `${friendlyName} ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  const { data, error } = await api.enroll({ factorType: "totp", friendlyName: name });
  if (error || !data || data.type !== "totp") fail(error, "Gagal memulai pendaftaran MFA.");
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Verifikasi kode TOTP untuk faktor tertentu (dipakai saat pendaftaran maupun login). Sukses → sesi aal2. */
export async function verifyTotp(api: MfaApi, factorId: string, code: string): Promise<void> {
  if (!isTotpCode(code)) throw new Error("Kode harus 6 digit angka.");
  const { error } = await api.challengeAndVerify({ factorId, code: code.trim() });
  if (error) fail(error, "Kode tidak valid.");
}

/**
 * Hapus faktor dengan autentikasi ulang: kode dari faktor yang masih terdaftar
 * diverifikasi dulu (challenge baru), baru faktor dihapus. Faktor terakhir tidak
 * boleh dihapus agar akun tidak kembali ke login satu faktor.
 */
export async function removeTotpWithStepUp(
  api: MfaApi,
  input: { factorId: string; stepUpFactorId: string; code: string },
): Promise<void> {
  const { verified } = await listTotpFactors(api);
  if (!verified.some((f) => f.id === input.factorId)) throw new Error("Faktor tidak ditemukan.");
  if (verified.length <= 1) throw new Error("Tambahkan authenticator pengganti dulu; faktor terakhir tidak dapat dihapus.");
  if (!verified.some((f) => f.id === input.stepUpFactorId)) throw new Error("Faktor verifikasi tidak valid.");
  await verifyTotp(api, input.stepUpFactorId, input.code);
  const { error } = await api.unenroll({ factorId: input.factorId });
  if (error) fail(error, "Gagal menghapus faktor.");
}
