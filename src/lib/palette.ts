/**
 * Palet chart (divalidasi dengan validator palet: lightness, chroma, CVD,
 * kontras). Warna mengikuti entitas, bukan urutan; status selalu disertai label.
 */
import type { Examiner, FindingStatus, RequestStatus } from "./types";

export const SERIES_PRIMARY = "#2563eb";
export const SERIES_SECONDARY = "#0d9488";
export const SELECTED = "#13315c";

export const EXAMINER_COLOR: Record<Examiner, string> = {
  BPK: "#1d4ed8",
  DAI: "#0d9488",
  KAA: "#7c3aed",
};

export const FINDING_STATUS_COLOR: Record<FindingStatus, string> = {
  selesai: "#0d9488",
  dalam_proses: "#d97706",
  belum_ditindaklanjuti: "#be123c",
};

export const REQUEST_STATUS_COLOR: Record<RequestStatus, string> = {
  lengkap: "#0d9488",
  bertahap: "#2563eb",
  dalam_proses: "#d97706",
  belum_dikirim: "#be123c",
};

export const GRID = "#e2e8f0";
export const AXIS_TEXT = "#475569";
