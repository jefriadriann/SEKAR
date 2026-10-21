import type { AssetAspect, AssetItem, AssetReconciliation, FindingStatus } from "../types";
import { ASSET_ASPECTS } from "../types";
import { percent } from "../format";
import { countBy, type CountItem } from "./common";

export interface AssetSummary {
  units: number;
  totalItems: number;
  reconciled: number;
  discrepancy: number;
  pctReconciled: number | null;
}

export function summarizeAssets(rows: AssetReconciliation[]): AssetSummary {
  const totalItems = rows.reduce((s, r) => s + r.total_items, 0);
  const reconciled = rows.reduce((s, r) => s + r.reconciled_items, 0);
  const discrepancy = rows.reduce((s, r) => s + r.discrepancy_items, 0);
  return {
    units: new Set(rows.map((r) => r.unit_id)).size,
    totalItems,
    reconciled,
    discrepancy,
    pctReconciled: percent(reconciled, totalItems),
  };
}

export function reconciliationRate(r: AssetReconciliation): number | null {
  return percent(r.reconciled_items, r.total_items);
}

/** Satu aset (nomor aset) beserta seluruh ketidaksesuaian hasil asesmennya. */
export interface AssessedAsset {
  key: string;
  reconciliation_id: string;
  unit_id: string;
  asset_number: string;
  asset_name: string;
  category: string;
  location: string;
  acquisition_date: string;
  acquisition_cost: number;
  useful_life: number;
  issues: AssetItem[];
  /** Status gabungan: selesai hanya bila seluruh ketidaksesuaian selesai. */
  status: FindingStatus;
}

const STATUS_RANK: Record<FindingStatus, number> = { belum_ditindaklanjuti: 0, dalam_proses: 1, selesai: 2 };

/** Kelompokkan baris asset_items per (rekonsiliasi, nomor aset). Urutan mengikuti kemunculan pertama. */
export function groupAssets(items: AssetItem[]): AssessedAsset[] {
  const map = new Map<string, AssessedAsset>();
  for (const it of items) {
    const key = `${it.reconciliation_id}|${it.asset_number}`;
    let a = map.get(key);
    if (!a) {
      a = {
        key,
        reconciliation_id: it.reconciliation_id,
        unit_id: it.unit_id,
        asset_number: it.asset_number,
        asset_name: it.asset_name,
        category: it.category,
        location: it.location,
        acquisition_date: it.acquisition_date,
        acquisition_cost: it.acquisition_cost,
        useful_life: it.useful_life,
        issues: [],
        status: it.status,
      };
      map.set(key, a);
    }
    a.issues.push(it);
    if (STATUS_RANK[it.status] < STATUS_RANK[a.status]) a.status = it.status;
  }
  return [...map.values()];
}

export interface AspectCheck {
  aspect: AssetAspect;
  ok: boolean;
  issue: AssetItem | null;
}

/** Daftar periksa seluruh aspek asesmen untuk satu aset: aspek tanpa catatan dianggap sesuai. */
export function assetChecklist(asset: AssessedAsset): AspectCheck[] {
  return ASSET_ASPECTS.map((aspect) => {
    const issue = asset.issues.find((i) => i.aspect === aspect) ?? null;
    return { aspect, ok: !issue, issue };
  });
}

/** Jumlah ketidaksesuaian per aspek (urut sesuai ASSET_ASPECTS, aspek kosong tetap tampil). */
export function issuesByAspect(items: AssetItem[]): CountItem[] {
  return countBy(items, (i) => i.aspect, ASSET_ASPECTS);
}

export interface AssetItemFilters {
  aspect: AssetAspect | "all";
  status: FindingStatus | "all";
  search: string;
}

export function filterAssets(assets: AssessedAsset[], f: AssetItemFilters): AssessedAsset[] {
  const q = f.search.trim().toLowerCase();
  return assets.filter(
    (a) =>
      (f.aspect === "all" || a.issues.some((i) => i.aspect === f.aspect)) &&
      (f.status === "all" || a.status === f.status) &&
      (!q || [a.asset_number, a.asset_name, a.category, a.location].some((v) => v.toLowerCase().includes(q))),
  );
}
