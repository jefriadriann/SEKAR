"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, FileJson, RotateCcw, Upload } from "lucide-react";
import { ReconcileIcon } from "@/components/icons/Illustrations";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { Modal } from "@/components/ui/Overlay";
import { Badge, Button, Card, DescriptionList, PageHeader, SectionHeader, SimulationNote } from "@/components/ui/primitives";
import { formatDateLong } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import { formatNumber } from "@/lib/format";
import { COLLECTION_KEYS } from "@/lib/types";
import { parseAndValidate, type ValidationResult } from "@/lib/validation";

const MAX_BYTES = 5 * 1024 * 1024;

export function AdminView() {
  const { fullDataset, source, importDataset, resetToSeed, config, notify, asOf } = useReadySekar();
  const [result, setResult] = useState<(ValidationResult & { label: string }) | null>(null);
  const [paste, setPaste] = useState("");
  const [confirm, setConfirm] = useState<"import" | "reset" | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isDummy = config.mode === "dummy";

  const check = (text: string, label: string) => setResult({ ...parseAndValidate(text), label });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setResult({ ok: false, errors: [{ path: "$", message: "Berkas lebih dari 5 MB." }], warnings: [], label: file.name });
      return;
    }
    check(await file.text(), file.name);
    if (fileRef.current) fileRef.current.value = "";
  };

  const apply = async () => {
    if (!result?.ok || !result.dataset) return;
    setBusy(true);
    const ok = await importDataset(result.dataset, `Import: ${result.label}`);
    setBusy(false);
    setConfirm(null);
    if (ok) setResult(null);
  };

  const doReset = async () => {
    setBusy(true);
    await resetToSeed();
    setBusy(false);
    setConfirm(null);
  };

  const exportJson = () => {
    downloadText(`sekar-dataset-SIMULASI-${asOf}.json`, JSON.stringify(fullDataset, null, 2), "application/json;charset=utf-8");
    notify("Dataset aktif diekspor sebagai JSON.");
  };

  return (
    <div>
      <PageHeader icon={<ReconcileIcon size={46} />}
        title="Admin Dataset"
        description="Kelola dataset: import, export, dan reset."
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="info-dataset">
          <SectionHeader id="info-dataset" icon={<Database className="h-5 w-5 text-navy-700" aria-hidden />} title="Dataset aktif" />
          <DescriptionList
            items={[
              { term: "Nama", value: fullDataset.metadata.name },
              { term: "Versi", value: fullDataset.metadata.version },
              { term: "Tanggal dataset (as_of)", value: formatDateLong(fullDataset.metadata.as_of) },
              { term: "Sumber", value: source?.label ?? "—" },
              { term: "Dimuat", value: source ? new Date(source.loadedAt).toLocaleString("id-ID") : "—" },
              {
                term: "Perubahan lokal",
                value: source?.hasLocalChanges ? <Badge tone="amber">Ada perubahan demo tersimpan di browser</Badge> : <Badge tone="teal">Tidak ada</Badge>,
              },
              { term: "Sifat data", value: fullDataset.metadata.all_data_is_synthetic ? <Badge tone="amber">Seluruhnya simulasi</Badge> : "—" },
              { term: "Catatan", value: fullDataset.metadata.note ?? "—" },
            ]}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={exportJson}>
              <Download className="h-4 w-4" aria-hidden />
              Export JSON
            </Button>
            <Button variant="danger" onClick={() => setConfirm("reset")} disabled={!isDummy}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset ke seed awal
            </Button>
          </div>
        </Card>
        <Card aria-labelledby="jumlah-record">
          <SectionHeader id="jumlah-record" title="Jumlah record per koleksi" />
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Jumlah record dataset aktif dan pratinjau import</caption>
              <thead className="text-left text-muted">
                <tr>
                  <th scope="col" className="py-1.5">Koleksi</th>
                  <th scope="col" className="py-1.5 text-right">Aktif</th>
                  {result?.ok && <th scope="col" className="py-1.5 text-right">Pratinjau import</th>}
                </tr>
              </thead>
              <tbody>
                {COLLECTION_KEYS.map((k) => (
                  <tr key={k} className="border-t border-slate-100">
                    <td className="py-1.5 font-mono text-xs">{k}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatNumber(fullDataset[k].length)}</td>
                    {result?.ok && <td className="py-1.5 text-right font-semibold tabular-nums">{formatNumber(result.counts?.[k] ?? 0)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card aria-labelledby="import">
        <SectionHeader
          id="import"
          icon={<FileJson className="h-5 w-5 text-violet-700" aria-hidden />}
          title="Import dataset JSON"
          description="Dataset divalidasi sebelum diterapkan."
        />
        {!isDummy && <SimulationNote>Import hanya tersedia di mode demo.</SimulationNote>}
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="import-file" className="text-xs font-bold uppercase tracking-wide text-muted">
              Pilih berkas .json
            </label>
            <input
              ref={fileRef}
              id="import-file"
              type="file"
              accept="application/json,.json"
              disabled={!isDummy}
              onChange={(e) => onFile(e.target.files?.[0])}
              className="mt-1 block w-full rounded-lg border border-dashed border-sky-300 bg-sky-50/60 p-4 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-navy-800 file:px-3 file:py-1.5 file:font-semibold file:text-white"
            />
            <p className="mt-1 text-xs text-muted">Maksimal 5 MB. Berkas dibaca di browser dan tidak diunggah.</p>
          </div>
          <div>
            <label htmlFor="import-paste" className="text-xs font-bold uppercase tracking-wide text-muted">
              Atau tempel teks JSON
            </label>
            <textarea
              id="import-paste"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={4}
              disabled={!isDummy}
              placeholder='{"metadata": {...}, "units": [...], ...}'
              className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-2 font-mono text-xs"
            />
            <Button size="sm" className="mt-1" onClick={() => check(paste, "teks tempel")} disabled={!paste.trim() || !isDummy}>
              <Upload className="h-4 w-4" aria-hidden />
              Validasi teks
            </Button>
          </div>
        </div>

        {result && (
          <div className="mt-4" aria-live="polite">
            {result.ok ? (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <p className="flex items-center gap-2 font-bold text-teal-900">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  Validasi berhasil: {result.label}
                </p>
                <p className="mt-1 text-sm text-teal-900">
                  {result.dataset?.metadata.name} v{result.dataset?.metadata.version}, tanggal dataset {formatDateLong(result.dataset?.metadata.as_of)}. Lihat kolom
                  &quot;Pratinjau import&quot; pada tabel jumlah record.
                </p>
                {result.warnings.length > 0 && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer font-semibold text-amber-900">{result.warnings.length} peringatan (tidak menghalangi import)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      {result.warnings.slice(0, 30).map((w, i) => (
                        <li key={i}>
                          <code>{w.path}</code>: {w.message}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => setConfirm("import")}>
                    Terapkan dataset ini
                  </Button>
                  <Button onClick={() => setResult(null)}>Batal</Button>
                </div>
              </div>
            ) : (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="flex items-center gap-2 font-bold text-rose-900">
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                  Dataset ditolak ({result.errors.length}
                  {result.errors.length >= 200 ? "+" : ""} kesalahan): {result.label}
                </p>
                <p className="mt-1 text-sm text-rose-900">Dataset aktif tidak diubah.</p>
                <ul className="mt-2 max-h-64 list-disc overflow-y-auto pl-5 text-sm text-rose-900">
                  {result.errors.slice(0, 50).map((e, i) => (
                    <li key={i}>
                      <code>{e.path}</code>: {e.message}
                    </li>
                  ))}
                </ul>
                <Button className="mt-3" onClick={() => setResult(null)}>
                  Tutup
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={confirm === "import"}
        onClose={() => setConfirm(null)}
        title="Ganti dataset aktif?"
        footer={
          <>
            <Button onClick={() => setConfirm(null)} data-autofocus>
              Batal
            </Button>
            <Button variant="primary" onClick={apply} disabled={busy}>
              Ya, ganti dataset
            </Button>
          </>
        }
      >
        Dataset aktif beserta seluruh perubahan demo lokal akan diganti dengan &quot;{result?.label}&quot;. Seed asli tetap tersedia melalui tombol Reset.
      </Modal>
      <Modal
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        title="Reset ke seed awal?"
        footer={
          <>
            <Button onClick={() => setConfirm(null)} data-autofocus>
              Batal
            </Button>
            <Button variant="danger" onClick={doReset} disabled={busy}>
              Ya, reset
            </Button>
          </>
        }
      >
        Semua perubahan demo dan dataset hasil import di browser ini akan dihapus, lalu data kembali ke data/sekar-dummy.json. Tanggal acuan juga kembali ke
        tanggal dataset.
      </Modal>
    </div>
  );
}
