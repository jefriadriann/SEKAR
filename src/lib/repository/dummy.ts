/**
 * Repository mode dummy. Sumber data: data/sekar-dummy.json (tidak pernah
 * diubah). Perubahan demo disimpan di localStorage dengan namespace dan versi,
 * dan dapat di-reset. Tidak ada upload ke server.
 */
import type { ComplianceStatus, Dataset, FindingStatus, ISODate, SekarDocument } from "../types";
import { updateComplianceInDataset, updateFindingInDataset, updateRequestInDataset, type RequestPatch } from "../mutations";
import { validateDataset } from "../validation";
import { documentFilename, documentText, type DatasetSource, type DocumentContent, type LoadResult, type SekarRepository } from "./types";

export const STORAGE_NAMESPACE = "sekar-demo";
export const STORAGE_VERSION = 2;
export const DATASET_KEY = `${STORAGE_NAMESPACE}:v${STORAGE_VERSION}:dataset`;
export const PREFS_KEY = `${STORAGE_NAMESPACE}:v${STORAGE_VERSION}:prefs`;

let seedCache: Dataset | null = null;

/**
 * Seed dimuat sebagai chunk terpisah (dynamic import) agar paket JavaScript
 * awal kecil dan halaman tampil lebih cepat.
 */
export async function loadSeedDataset(): Promise<Dataset> {
  if (!seedCache) {
    const mod = await import("../../../data/sekar-dummy.json");
    seedCache = (mod.default ?? mod) as unknown as Dataset;
  }
  return seedCache;
}

export function getSeedDataset(): Dataset {
  if (!seedCache) throw new Error("Seed belum dimuat; panggil loadSeedDataset() terlebih dahulu.");
  // Salinan dalam agar seed tidak pernah termutasi.
  return structuredClone(seedCache);
}

interface StoredState {
  version: number;
  source: { kind: "seed" | "import"; label: string; loadedAt: string };
  hasLocalChanges: boolean;
  dataset: Dataset;
}

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStorage(): KV | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    const k = `${STORAGE_NAMESPACE}:probe`;
    s.setItem(k, "1");
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export class DummyRepository implements SekarRepository {
  readonly mode = "dummy" as const;
  private state: StoredState | null = null;
  private storage: KV | null;
  /** Peringatan bila penyimpanan lokal tidak tersedia/rusak. */
  warning: string | null = null;

  constructor(storage?: KV | null) {
    this.storage = storage === undefined ? safeStorage() : storage;
    // Bersihkan data versi lama (dataset lebih kecil / persona tersimpan) agar demo mulai dari seed terbaru.
    for (let v = 1; v < STORAGE_VERSION; v++) {
      this.storage?.removeItem(`${STORAGE_NAMESPACE}:v${v}:dataset`);
      this.storage?.removeItem(`${STORAGE_NAMESPACE}:v${v}:prefs`);
    }
    if (!this.storage) this.warning = "Penyimpanan lokal browser tidak tersedia; perubahan demo hanya bertahan sampai halaman dimuat ulang.";
  }

  private seedState(): StoredState {
    return {
      version: STORAGE_VERSION,
      source: { kind: "seed", label: "data/sekar-dummy.json (seed bawaan)", loadedAt: new Date().toISOString() },
      hasLocalChanges: false,
      dataset: getSeedDataset(),
    };
  }

  private read(): StoredState {
    if (this.state) return this.state;
    const raw = this.storage?.getItem(DATASET_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredState;
        const check = parsed?.version === STORAGE_VERSION ? validateDataset(parsed.dataset) : null;
        if (check?.ok) {
          this.state = parsed;
          return parsed;
        }
        this.warning = "Data demo lokal tidak valid atau versinya berbeda, sehingga dikembalikan ke seed awal.";
      } catch {
        this.warning = "Data demo lokal rusak, sehingga dikembalikan ke seed awal.";
      }
      this.storage?.removeItem(DATASET_KEY);
    }
    this.state = this.seedState();
    return this.state;
  }

  private write(next: StoredState): LoadResult {
    this.state = next;
    if (next.source.kind === "seed" && !next.hasLocalChanges) {
      this.storage?.removeItem(DATASET_KEY);
    } else {
      try {
        this.storage?.setItem(DATASET_KEY, JSON.stringify(next));
      } catch {
        this.warning = "Perubahan tidak dapat disimpan di browser (kuota penuh?). Perubahan hanya bertahan di sesi ini.";
      }
    }
    return this.result();
  }

  private result(): LoadResult {
    const s = this.read();
    const source: DatasetSource = { ...s.source, hasLocalChanges: s.hasLocalChanges };
    return { dataset: s.dataset, source };
  }

  async load(): Promise<LoadResult> {
    await loadSeedDataset();
    return this.result();
  }

  private mutate(fn: (ds: Dataset) => Dataset): LoadResult {
    const s = this.read();
    return this.write({ ...s, hasLocalChanges: true, dataset: fn(s.dataset) });
  }

  async updateFindingStatus(id: string, status: FindingStatus, asOf: ISODate) {
    await loadSeedDataset();
    return this.mutate((ds) => updateFindingInDataset(ds, id, status, asOf));
  }

  async updateDocumentRequest(id: string, patch: RequestPatch, asOf: ISODate) {
    await loadSeedDataset();
    return this.mutate((ds) => updateRequestInDataset(ds, id, patch, asOf));
  }

  async updateComplianceStatus(id: string, status: ComplianceStatus) {
    await loadSeedDataset();
    return this.mutate((ds) => updateComplianceInDataset(ds, id, status));
  }

  async replaceDataset(ds: Dataset, label: string) {
    await loadSeedDataset();
    const check = validateDataset(ds);
    if (!check.ok) throw new Error("Dataset tidak valid; dataset aktif tidak diubah.");
    return this.write({
      version: STORAGE_VERSION,
      source: { kind: "import", label, loadedAt: new Date().toISOString() },
      hasLocalChanges: false,
      dataset: structuredClone(ds),
    });
  }

  async resetToSeed() {
    await loadSeedDataset();
    this.storage?.removeItem(DATASET_KEY);
    this.state = null;
    this.warning = this.storage ? null : this.warning;
    return this.write(this.seedState());
  }

  async getDocumentContent(doc: SekarDocument): Promise<DocumentContent> {
    return { kind: "text", text: documentText(doc), filename: documentFilename(doc) };
  }
}
