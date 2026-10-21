/**
 * Ilustrasi wilayah 46 KPw SIMULASI (urutan Aceh → Papua Barat). Hanya untuk visual
 * (landmark beranda) dan label pilihan unit; data audit tetap fiktif.
 */
import data from "../../data/base/kpw-regions.json";

export interface KpwRegion {
  unit_id: string;
  region: string;
  city: string;
  korwil: string;
  landmark: string;
  /** Kunci ilustrasi landmark (src/components/landmarks). */
  key: string;
}

export const KPW_REGIONS: KpwRegion[] = data.regions;
const byId = new Map(KPW_REGIONS.map((r) => [r.unit_id, r]));

export function regionFor(unitId: string | null | undefined): KpwRegion | null {
  return unitId ? (byId.get(unitId) ?? null) : null;
}

/** Label unit untuk pilihan/daftar: "KPw Simulasi 01 · Aceh". */
export function unitLabel(unit: { id: string; name: string }): string {
  const r = regionFor(unit.id);
  return r ? `${unit.name} · ${r.region}` : unit.name;
}
