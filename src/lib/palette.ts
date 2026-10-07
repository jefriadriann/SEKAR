/**
 * Palet chart SEKAR: spektrum warna cerah (indigo → violet → magenta → koral → amber → hijau → biru langit)
 * agar setiap kategori mudah dibedakan dan tampilan tidak monoton.
 * Warna status selalu disertai label/ikon; chart memiliki tampilan tabel alternatif.
 */
import type { Examiner, FindingStatus, RequestStatus } from "./types";

export const SERIES_PRIMARY = "#6d28d9";
export const SERIES_SECONDARY = "#ec4899";
export const SELECTED = "#1e1b4b";

/** Urutan warna bar per kategori (terbesar → terkecil). Pasangan [awal, akhir] gradasi. */
export const CATEGORY_GRADIENTS: [string, string][] = [
  ["#4f46e5", "#818cf8"],
  ["#7c3aed", "#c084fc"],
  ["#c026d3", "#f0abfc"],
  ["#e11d48", "#fb7185"],
  ["#ea580c", "#fdba74"],
  ["#d97706", "#fcd34d"],
  ["#059669", "#6ee7b7"],
  ["#0d9488", "#5eead4"],
  ["#0284c7", "#7dd3fc"],
  ["#2563eb", "#93c5fd"],
];
export const CATEGORY_RAMP = CATEGORY_GRADIENTS.map(([c]) => c);

export const EXAMINER_COLOR: Record<Examiner, string> = {
  BPK: "#4f46e5",
  DAI: "#06b6d4",
  KAA: "#ec4899",
};

export const FINDING_STATUS_COLOR: Record<FindingStatus, string> = {
  selesai: "#22b07d",
  dalam_proses: "#f0b429",
  belum_ditindaklanjuti: "#e5484d",
};

export const REQUEST_STATUS_COLOR: Record<RequestStatus, string> = {
  lengkap: "#3cc48d",
  bertahap: "#f5c451",
  dalam_proses: "#2f6fe4",
  belum_dikirim: "#ef6b6b",
};

export const GRID = "#e8eef6";
export const AXIS_TEXT = "#55657f";
