/**
 * Palet chart mengikuti referensi visual SEKAR (biru dominan, aksen teal/amber/violet).
 * Warna status selalu disertai label/ikon; chart memiliki tampilan tabel alternatif.
 */
import type { Examiner, FindingStatus, RequestStatus } from "./types";

export const SERIES_PRIMARY = "#1d58b5";
export const SERIES_SECONDARY = "#449efe";
export const SELECTED = "#0c1a4d";

/** Urutan warna bar per kategori (terbesar → terkecil), sesuai referensi. */
export const CATEGORY_RAMP = ["#1d58b5", "#449efe", "#7cbcf6", "#8ad8ef", "#6fd3b4", "#f2c94c", "#a9c9f0", "#c9b8f0", "#9fb4d6", "#b9d3ea"];

export const EXAMINER_COLOR: Record<Examiner, string> = {
  BPK: "#1d58b5",
  DAI: "#449efe",
  KAA: "#a98ce8",
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
