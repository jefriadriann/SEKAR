/**
 * Palet chart SEKAR: korporat dan kalem — gradasi biru-navy solid (gelap → terang sesuai peringkat)
 * dengan aksen emas. Warna status selalu disertai label/ikon; chart memiliki tampilan tabel alternatif.
 */
import type { Examiner, FindingStatus, RequestStatus } from "./types";

export const SERIES_PRIMARY = "#1d4f9e";
export const SERIES_SECONDARY = "#1d4f9e";
export const SELECTED = "#c9a24a";

/** Urutan warna bar per kategori (terbesar → terkecil): satu keluarga biru-navy, warna solid. */
export const CATEGORY_GRADIENTS: [string, string][] = [
  ["#13235a", "#13235a"],
  ["#1a3577", "#1a3577"],
  ["#1d4f9e", "#1d4f9e"],
  ["#2c5fae", "#2c5fae"],
  ["#3f70b9", "#3f70b9"],
  ["#5583c4", "#5583c4"],
  ["#6c95ce", "#6c95ce"],
  ["#84a7d8", "#84a7d8"],
  ["#9db9e1", "#9db9e1"],
  ["#b5cae9", "#b5cae9"],
];
export const CATEGORY_RAMP = CATEGORY_GRADIENTS.map(([c]) => c);

export const EXAMINER_COLOR: Record<Examiner, string> = {
  BPK: "#13235a",
  DAI: "#4677bf",
  KAA: "#c9a24a",
};

export const FINDING_STATUS_COLOR: Record<FindingStatus, string> = {
  selesai: "#2e7d5b",
  dalam_proses: "#c58f2a",
  belum_ditindaklanjuti: "#b23b3b",
};

export const REQUEST_STATUS_COLOR: Record<RequestStatus, string> = {
  lengkap: "#2e7d5b",
  bertahap: "#d4a64a",
  dalam_proses: "#1d4f9e",
  belum_dikirim: "#b23b3b",
};

export const GRID = "#e8eef6";
export const AXIS_TEXT = "#55657f";
