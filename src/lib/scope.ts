/**
 * Aturan cakupan data (scope) per peran.
 *
 * PENTING: di mode dummy, pembatasan ini hanya simulasi UX. Dataset tetap
 * berada di browser dan dapat diperiksa siapa pun. Proteksi sesungguhnya
 * hanya ada di backend Supabase melalui RLS (lihat supabase/migrations).
 */
import { DR_UNIT_ID, type Dataset, type Role, type Viewer } from "./types";

export type AppRoute = "/" | "/hasil-pemeriksaan" | "/permindok" | "/jadwal-pemeriksaan" | "/sgo-ketentuan" | "/dr" | "/admin";

const ROUTE_ROLES: Record<AppRoute, Role[]> = {
  "/": ["dr", "kpw", "admin"],
  "/hasil-pemeriksaan": ["dr", "kpw", "admin"],
  "/permindok": ["dr", "kpw", "admin"],
  "/jadwal-pemeriksaan": ["dr", "kpw", "admin"],
  "/sgo-ketentuan": ["dr", "kpw", "admin"],
  "/dr": ["dr", "admin"],
  "/admin": ["admin"],
};

export function canAccessRoute(role: Role, route: AppRoute): boolean {
  return ROUTE_ROLES[route].includes(role);
}

/** Apakah peran ini boleh melihat semua unit (overview seluruh KPw). */
export function seesAllUnits(role: Role): boolean {
  return role === "dr" || role === "admin";
}

function canSeeUnit(viewer: Viewer, unitId: string): boolean {
  return seesAllUnits(viewer.role) || unitId === viewer.unit_id;
}

/**
 * Menyaring dataset sesuai peran:
 * - dr/admin: seluruh data.
 * - kpw: hanya unit sendiri + dokumen/materi shared; tidak ada data DR.
 */
export function scopeDatasetForViewer(ds: Dataset, viewer: Viewer): Dataset {
  if (seesAllUnits(viewer.role)) return ds;
  const own = (unitId: string) => canSeeUnit(viewer, unitId) && unitId !== DR_UNIT_ID;
  return {
    ...ds,
    units: ds.units.filter((u) => own(u.id)),
    findings: ds.findings.filter((f) => own(f.unit_id)),
    document_requests: ds.document_requests.filter((r) => own(r.unit_id)),
    audit_schedules: ds.audit_schedules.filter((s) => own(s.unit_id)),
    references: ds.references.filter((r) => r.scope === "shared" || own(r.scope)),
    documents: ds.documents.filter((d) => d.scope === "shared" || own(d.scope)),
    compliance: ds.compliance.filter((c) => own(c.unit_id)),
    asset_reconciliations: ds.asset_reconciliations.filter((a) => own(a.unit_id)),
    demo_personas: ds.demo_personas,
  };
}

/** Modul KPw tidak pernah memuat data unit DR. */
export function excludeDr<T extends { unit_id: string }>(rows: T[]): T[] {
  return rows.filter((r) => r.unit_id !== DR_UNIT_ID);
}

export function onlyDr<T extends { unit_id: string }>(rows: T[]): T[] {
  return rows.filter((r) => r.unit_id === DR_UNIT_ID);
}

/** Data untuk modul KPw (hasil pemeriksaan, permindok, jadwal) — selalu tanpa DR. */
export function kpwModuleData(ds: Dataset) {
  return {
    units: ds.units.filter((u) => u.id !== DR_UNIT_ID),
    findings: excludeDr(ds.findings),
    document_requests: excludeDr(ds.document_requests),
    audit_schedules: excludeDr(ds.audit_schedules),
    asset_reconciliations: excludeDr(ds.asset_reconciliations),
  };
}

/** Dokumen yang boleh dibuka viewer (dipakai untuk preview/unduh). */
export function canOpenDocument(viewer: Viewer, scope: string): boolean {
  if (scope === "shared") return true;
  if (scope === DR_UNIT_ID) return viewer.role === "dr" || viewer.role === "admin";
  return canSeeUnit(viewer, scope);
}
