/**
 * Repository mode Supabase (OPSIONAL). Hanya memakai anon key publik dan
 * sesi Auth pengguna; seluruh otorisasi ditegakkan oleh RLS di database
 * (supabase/migrations). Tidak ada service-role key di browser.
 *
 * Catatan: implementasi ini belum diuji terhadap proyek Supabase nyata
 * dalam repo ini — lihat README bagian "Supabase (opsional)".
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ComplianceStatus, Dataset, DatasetMetadata, FindingStatus, ISODate, SekarDocument, Viewer } from "../types";
import { applyFindingStatus, replaceById, validateRequestPatch, type RequestPatch } from "../mutations";
import { documentFilename, documentText, type DocumentContent, type LoadResult, type SekarRepository } from "./types";

const PAGE = 1000;

export class SupabaseConfigError extends Error {}

export class SupabaseRepository implements SekarRepository {
  readonly mode = "supabase" as const;
  readonly client: SupabaseClient;
  private cache: LoadResult | null = null;

  constructor(url: string | undefined, anonKey: string | undefined) {
    if (!url || !anonKey) {
      throw new SupabaseConfigError(
        "APP_DATA_MODE=supabase tetapi NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi.",
      );
    }
    this.client = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  }

  private async fetchAll<T>(table: string): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.client.from(table).select("*").order("id").range(from, from + PAGE - 1);
      if (error) throw new Error(`Gagal membaca tabel ${table}: ${error.message}`);
      out.push(...((data ?? []) as T[]));
      if (!data || data.length < PAGE) return out;
    }
  }

  /** Viewer dari tabel user_access (dipetakan admin). null = belum berwenang. */
  async getViewer(): Promise<Viewer | null> {
    const { data: auth } = await this.client.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await this.client
      .from("user_access")
      .select("user_id, role, unit_id, display_name")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw new Error(`Gagal membaca pemetaan akses: ${error.message}`);
    if (!data) return null;
    return {
      id: data.user_id,
      name: data.display_name ?? auth.user.email ?? "Pengguna",
      role: data.role,
      unit_id: data.unit_id,
      simulated: false,
    };
  }

  async load(): Promise<LoadResult> {
    const viewer = await this.getViewer();
    if (!viewer) throw new Error("Akun belum dipetakan ke peran/unit oleh admin.");
    const [metaRows, units, findings, requests, schedules, references, documents, compliance, assets] = await Promise.all([
      this.fetchAll<DatasetMetadata & { id: number }>("dataset_metadata"),
      this.fetchAll<Dataset["units"][number]>("units"),
      this.fetchAll<Dataset["findings"][number]>("findings"),
      this.fetchAll<Dataset["document_requests"][number]>("document_requests"),
      this.fetchAll<Dataset["audit_schedules"][number]>("audit_schedules"),
      this.fetchAll<Dataset["references"][number]>("reference_materials"),
      this.fetchAll<SekarDocument>("documents"),
      this.fetchAll<Dataset["compliance"][number]>("compliance_items"),
      this.fetchAll<Dataset["asset_reconciliations"][number]>("asset_reconciliations"),
    ]);
    const meta = metaRows[0];
    if (!meta) throw new Error("Tabel dataset_metadata kosong. Jalankan supabase/seed.sql terlebih dahulu.");
    const dataset: Dataset = {
      metadata: {
        name: meta.name,
        version: meta.version,
        as_of: meta.as_of,
        all_data_is_synthetic: meta.all_data_is_synthetic,
        note: meta.note,
      },
      units,
      findings,
      document_requests: requests,
      audit_schedules: schedules,
      references,
      documents,
      compliance,
      asset_reconciliations: assets,
      demo_personas: [],
    };
    this.cache = {
      dataset,
      viewer,
      source: { kind: "supabase", label: "Supabase (RLS aktif sesuai peran)", loadedAt: new Date().toISOString(), hasLocalChanges: false },
    };
    return this.cache;
  }

  private async current(): Promise<LoadResult> {
    return this.cache ?? this.load();
  }

  private async updateRow<T>(table: string, id: string, patch: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.from(table).update(patch).eq("id", id).select("*");
    if (error) throw new Error(`Gagal menyimpan: ${error.message}`);
    if (!data || data.length === 0) throw new Error("Perubahan ditolak: tidak berwenang mengubah data ini.");
    return data[0] as T;
  }

  async updateFindingStatus(id: string, status: FindingStatus, asOf: ISODate) {
    const cur = await this.current();
    const f = cur.dataset.findings.find((x) => x.id === id);
    if (!f) throw new Error(`Temuan ${id} tidak ditemukan.`);
    const next = applyFindingStatus(f, status, asOf);
    const saved = await this.updateRow<typeof f>("findings", id, { status: next.status, completed_at: next.completed_at });
    this.cache = { ...cur, dataset: { ...cur.dataset, findings: replaceById(cur.dataset.findings, saved) } };
    return this.cache;
  }

  async updateDocumentRequest(id: string, patch: RequestPatch, asOf: ISODate) {
    const cur = await this.current();
    const r = cur.dataset.document_requests.find((x) => x.id === id);
    if (!r) throw new Error(`Permintaan ${id} tidak ditemukan.`);
    const errors = validateRequestPatch(r, patch, asOf);
    if (errors.length) throw new Error(errors.join(" "));
    const saved = await this.updateRow<typeof r>("document_requests", id, { ...patch });
    this.cache = { ...cur, dataset: { ...cur.dataset, document_requests: replaceById(cur.dataset.document_requests, saved) } };
    return this.cache;
  }

  async updateComplianceStatus(id: string, status: ComplianceStatus) {
    const cur = await this.current();
    const saved = await this.updateRow<Dataset["compliance"][number]>("compliance_items", id, { status });
    this.cache = { ...cur, dataset: { ...cur.dataset, compliance: replaceById(cur.dataset.compliance, saved) } };
    return this.cache;
  }

  async replaceDataset(): Promise<LoadResult> {
    throw new Error("Import dataset lewat browser hanya tersedia di mode dummy. Di Supabase gunakan migration dan seed SQL.");
  }

  async resetToSeed(): Promise<LoadResult> {
    throw new Error("Reset seed lewat browser hanya tersedia di mode dummy.");
  }

  async getDocumentContent(doc: SekarDocument): Promise<DocumentContent> {
    if (!doc.storage_path) return { kind: "text", text: documentText(doc), filename: documentFilename(doc) };
    const { data } = await this.client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sesi berakhir. Silakan masuk kembali.");
    // Route API memvalidasi sesi + izin baca dokumen (RLS) sebelum membuat signed URL.
    const res = await fetch(`/api/documents/${encodeURIComponent(doc.id)}/signed-url`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !body.url) throw new Error(body.error ?? "Dokumen tidak dapat dibuka.");
    return { kind: "url", url: body.url, filename: documentFilename(doc) };
  }
}
