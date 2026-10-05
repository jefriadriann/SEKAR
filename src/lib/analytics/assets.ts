import type { AssetReconciliation } from "../types";
import { percent } from "../format";

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
