import type { AssetAction, AssetAspect, ComplianceStatus, FindingStatus, ReferenceKind, RequestStatus, Role } from "./types";

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  selesai: "Selesai",
  dalam_proses: "Dalam Proses",
  belum_ditindaklanjuti: "Belum Ditindaklanjuti",
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  lengkap: "Lengkap",
  bertahap: "Bertahap",
  dalam_proses: "Dalam Proses",
  belum_dikirim: "Belum Dikirim",
};

export const COMPLIANCE_STATUS_LABEL: Record<ComplianceStatus, string> = {
  selesai: "Selesai",
  dalam_proses: "Dalam Proses",
  belum_dimulai: "Belum Dimulai",
};

export const REFERENCE_KIND_LABEL: Record<ReferenceKind, string> = {
  worksheet: "Worksheet",
  ketentuan: "Ketentuan",
  tutorial: "Tutorial",
};

export const ASSET_ASPECT_LABEL: Record<AssetAspect, string> = {
  umur_ekonomis: "Umur ekonomis",
  harga_perolehan: "Harga perolehan",
  satuan_aset: "Satuan pencatatan",
  keberadaan_fisik: "Keberadaan fisik",
  kondisi_fisik: "Kondisi fisik",
  lokasi: "Lokasi / penanggung jawab",
  klasifikasi: "Kode klasifikasi",
  dokumen_kepemilikan: "Dokumen kepemilikan",
  label: "Label aset",
};

export const ASSET_ACTION_LABEL: Record<AssetAction, string> = {
  split: "Split Aset",
  penghapusan: "Penghapusan Aset",
  penatausahaan: "Penatausahaan Aset",
  mutasi: "Mutasi Aset",
  reklasifikasi: "Reklasifikasi Aset",
  koreksi_nilai: "Koreksi Harga Perolehan",
  penyesuaian_umur: "Penyesuaian Umur Ekonomis",
  inventarisasi: "Inventarisasi Fisik",
};

export function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

export const ROLE_LABEL: Record<Role, string> = {
  dr: "DR",
  kpw: "KPw",
  admin: "Admin",
};

/** Persentase aman terhadap denominator nol. Mengembalikan null bila denominator 0. */
export function percent(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return (numerator / denominator) * 100;
}

export function formatPercent(value: number | null, digits = 0): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
}

/** Hilangkan awalan penanda dummy untuk tampilan tabel (penanda mode demo tetap tampil global). */
export function clean(text: string): string {
  return text.replace(/^\[(DATA DUMMY|SIMULASI)\]\s*/, "");
}
