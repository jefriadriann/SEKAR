/**
 * Materi SGo & ketentuan: pengelompokan referensi per area dan pratinjau
 * worksheet. Fungsi murni (diuji di tests/).
 */
import type { Reference, SekarDocument } from "./types";

export const WORKSHEET_SUBKINDS = ["ws_aktivitas_supervisi", "ws_pengendalian"] as const;
export const KETENTUAN_SUBKINDS = ["pdg", "padgi", "juknis", "se_intern"] as const;

export const MATERIAL_LABEL: Record<string, string> = {
  ws_aktivitas_supervisi: "Worksheet Aktivitas & Supervisi",
  ws_pengendalian: "Worksheet Pengendalian",
  pdg: "PDG",
  padgi: "PADGI",
  juknis: "Juknis",
  se_intern: "SE Intern",
};

export const MATERIAL_LONG_LABEL: Record<string, string> = {
  pdg: "Peraturan Dewan Gubernur",
  padgi: "Peraturan Anggota Dewan Gubernur Intern",
  juknis: "Petunjuk Teknis",
  se_intern: "Surat Edaran Intern",
};

export interface AreaMaterials {
  area: string;
  worksheets: Reference[];
  ketentuan: Reference[];
}

const order = (list: readonly string[], r: Reference) => {
  const i = list.indexOf(r.subkind ?? "");
  return i < 0 ? list.length : i;
};

/** Area pemeriksaan beserta worksheet & ketentuannya (area tanpa worksheet/ketentuan tidak tampil). */
export function materialsByArea(refs: Reference[]): AreaMaterials[] {
  const map = new Map<string, AreaMaterials>();
  for (const r of refs) {
    if (r.kind === "tutorial") continue;
    const m = map.get(r.area) ?? { area: r.area, worksheets: [], ketentuan: [] };
    (r.kind === "worksheet" ? m.worksheets : m.ketentuan).push(r);
    map.set(r.area, m);
  }
  const list = [...map.values()];
  for (const m of list) {
    m.worksheets.sort((a, b) => order(WORKSHEET_SUBKINDS, a) - order(WORKSHEET_SUBKINDS, b));
    m.ketentuan.sort((a, b) => order(KETENTUAN_SUBKINDS, a) - order(KETENTUAN_SUBKINDS, b));
  }
  return list;
}

/** Video panduan (referensi tutorial) berdasarkan subkind, mis. "mutasi" atau "sgo_intro". */
export function findVideo(refs: Reference[], subkind: string): Reference | null {
  return refs.find((r) => r.kind === "tutorial" && r.subkind === subkind) ?? null;
}

export type FileKind = "pdf" | "xlsx" | "video" | "other";

export function fileKind(url: string | null | undefined): FileKind {
  const ext = (url ?? "").split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "mp4" || ext === "webm") return "video";
  return "other";
}

export interface WorksheetPreview {
  intro: string;
  header: string[];
  rows: string[][];
}

/** content_text worksheet: baris pengantar, baris kosong, lalu tabel TSV (header + contoh baris). */
export function worksheetPreview(doc: Pick<SekarDocument, "content_text">): WorksheetPreview | null {
  const [intro, table] = doc.content_text.split("\n\n");
  if (!table) return null;
  const lines = table.split("\n").map((l) => l.split("\t"));
  if (lines.length < 2) return null;
  return { intro, header: lines[0], rows: lines.slice(1) };
}

/** Label tombol singkat untuk satu materi. */
export function materialLabel(r: Reference): string {
  return (r.subkind && MATERIAL_LABEL[r.subkind]) || (r.kind === "worksheet" ? "Worksheet" : r.kind === "ketentuan" ? "Ketentuan" : "Video");
}

/** Sumber video demo: WebM (VP9) lebih dulu, MP4 (H.264) sebagai cadangan. */
export function videoSources(url: string): { src: string; type: string }[] {
  if (!url.endsWith(".mp4")) return [{ src: url, type: fileKind(url) === "video" ? "video/webm" : "" }];
  return [
    { src: `${url.slice(0, -4)}.webm`, type: "video/webm" },
    { src: url, type: "video/mp4" },
  ];
}
