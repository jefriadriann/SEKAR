import type { ComplianceStatus, FindingStatus, ReferenceKind, RequestStatus, Role } from "./types";

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  selesai: "Selesai",
  dalam_proses: "Dalam proses",
  belum_ditindaklanjuti: "Belum ditindaklanjuti",
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  lengkap: "Lengkap",
  bertahap: "Bertahap",
  dalam_proses: "Dalam proses",
  belum_dikirim: "Belum dikirim",
};

export const COMPLIANCE_STATUS_LABEL: Record<ComplianceStatus, string> = {
  selesai: "Selesai",
  dalam_proses: "Dalam proses",
  belum_dimulai: "Belum dimulai",
};

export const REFERENCE_KIND_LABEL: Record<ReferenceKind, string> = {
  worksheet: "Worksheet",
  ketentuan: "Ketentuan",
  tutorial: "Tutorial",
};

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
