"use client";

import { useMemo, useState } from "react";
import { Download, Eye, FileSpreadsheet, FileText, Info, ListChecks, PlayCircle, Scale } from "lucide-react";
import { AutoplayVideo } from "@/components/domain/MaterialViewer";
import { LibraryGearIcon } from "@/components/icons/Illustrations";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { Modal } from "@/components/ui/Overlay";
import { Badge, Button, Card, EmptyState, IconTile, PageHeader, SearchField, SectionHeader, SelectField, SimulationNote } from "@/components/ui/primitives";
import { ALL, matchesSearch } from "@/lib/analytics/common";
import { clean, REFERENCE_KIND_LABEL } from "@/lib/format";
import { findVideo, MATERIAL_LABEL, MATERIAL_LONG_LABEL, materialLabel, materialsByArea, type AreaMaterials } from "@/lib/materials";
import type { Reference, ReferenceKind } from "@/lib/types";

const MENU_KINDS = ["worksheet", "ketentuan"] as const satisfies readonly ReferenceKind[];
type MenuKind = (typeof MENU_KINDS)[number];
const KIND_ICON = { worksheet: FileSpreadsheet, ketentuan: Scale } as const;

export function SgoView() {
  const { data } = useReadySekar();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<MenuKind | typeof ALL>(ALL);
  const [popup, setPopup] = useState<{ area: AreaMaterials; kind: MenuKind } | null>(null);
  const areas = useMemo(() => materialsByArea(data.references), [data.references]);
  const intro = findVideo(data.references, "sgo_intro");
  const introDoc = intro ? data.documents.find((d) => d.id === intro.document_id) : null;
  const materials = data.references.filter((r) => r.kind === "worksheet" || r.kind === "ketentuan");
  const results = materials.filter((r) => (kind === ALL || r.kind === kind) && matchesSearch(search, r.title, r.area, r.description, r.subkind));
  const isSearching = search.trim() !== "" || kind !== ALL;
  const nWorksheet = materials.filter((r) => r.kind === "worksheet").length;

  return (
    <div>
      <PageHeader icon={<LibraryGearIcon size={46} />} title="SGo dan Ketentuan" description="Worksheet SGo dan ketentuan per area pemeriksaan." />

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid gap-4">
          <Card aria-labelledby="apa-sgo">
            <SectionHeader id="apa-sgo" icon={<Info />} title="Apa itu SGo?" />
            <p className="text-[15px] text-navy-900">
              Ruang materi panduan pemeriksaan berisi worksheet dan ketentuan per area sebagai rujukan bersama KPwDN dan DR.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="blue">{areas.length} area</Badge>
              <Badge tone="teal">{nWorksheet} worksheet Excel</Badge>
              <Badge tone="violet">{materials.length - nWorksheet} ketentuan PDF</Badge>
            </div>
          </Card>
          <Card aria-labelledby="tutorial-umum">
            <SectionHeader id="tutorial-umum" icon={<ListChecks />} iconTone="blue" title="Cara Menggunakan" />
            <ol className="list-decimal space-y-1.5 pl-5 text-[15px] text-navy-900">
              <li>Tonton video pengenalan SGo di samping.</li>
              <li>Pilih area, klik Worksheet lalu pilih Aktivitas &amp; Supervisi atau Pengendalian.</li>
              <li>Klik Ketentuan untuk membuka PDG, PADGI, Juknis, atau SE Intern.</li>
              <li>Pratinjau materi, lalu unduh berkas Excel/PDF.</li>
            </ol>
          </Card>
        </div>
        <Card aria-labelledby="video-sgo" className="flex flex-col">
          <SectionHeader
            id="video-sgo"
            icon={<PlayCircle />}
            title="Video Pengenalan SGo"
            actions={<Badge tone="amber">SIMULASI</Badge>}
          />
          {introDoc?.file_url ? (
            <AutoplayVideo src={introDoc.file_url} title="Video pengenalan SGo" loop className="aspect-video w-full flex-1 rounded-xl bg-[#0f1a45] object-cover" />
          ) : (
            <EmptyState title="Video belum tersedia" />
          )}
        </Card>
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <SearchField id="sgo-search" label="Cari materi" value={search} onChange={setSearch} placeholder="Cari area, worksheet, PDG, PADGI, juknis..." />
          <SelectField
            id="sgo-kind"
            label="Jenis materi"
            value={kind}
            onChange={setKind}
            options={[{ value: ALL, label: "Semua jenis" }, ...MENU_KINDS.map((k) => ({ value: k, label: REFERENCE_KIND_LABEL[k] }))]}
          />
        </div>
      </Card>

      {isSearching ? (
        <Card aria-labelledby="hasil-cari">
          <SectionHeader id="hasil-cari" title={`Hasil pencarian (${results.length})`} actions={<Button size="sm" onClick={() => { setSearch(""); setKind(ALL); }}>Reset pencarian</Button>} />
          {results.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {results.map((r) => (
                <MaterialRow key={r.id} r={r} compact />
              ))}
            </ul>
          ) : (
            <EmptyState title="Materi tidak ditemukan" description="Coba kata kunci lain." />
          )}
        </Card>
      ) : (
        <section aria-labelledby="grid-area">
          <h2 id="grid-area" className="mb-3 text-lg font-bold text-navy-900">
            Area pemeriksaan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {areas.map((a, i) => (
              <article key={a.area} className="panel relative flex flex-col overflow-hidden p-4 pl-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <span aria-hidden className="absolute inset-y-0 left-0 w-[4px]" style={{ background: "#1d4f9e" }} />
                <div className="flex items-center gap-3">
                  <IconTile tone="blue">
                    <span className="text-[15px] font-bold">{i + 1}</span>
                  </IconTile>
                  <h3 className="font-bold text-navy-900">{a.area}</h3>
                </div>
                <p className="mt-2 flex-1 text-sm text-muted">
                  {a.worksheets.length} worksheet · {a.ketentuan.length} ketentuan
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {MENU_KINDS.map((k) => {
                    const Icon = KIND_ICON[k];
                    return (
                      <Button key={k} size="sm" variant={k === "worksheet" ? "primary" : "secondary"} onClick={() => setPopup({ area: a, kind: k })}>
                        <Icon className="h-4 w-4" aria-hidden />
                        {REFERENCE_KIND_LABEL[k]}
                        <span className="sr-only"> {a.area}</span>
                      </Button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={!!popup}
        onClose={() => setPopup(null)}
        role="dialog"
        size="max-w-2xl"
        title={popup ? `${REFERENCE_KIND_LABEL[popup.kind]} · ${popup.area.area}` : "Materi"}
        subtitle={popup?.kind === "worksheet" ? "Pilih worksheet SGo (Excel)" : "Pilih jenis ketentuan (PDF)"}
      >
        {popup && (
          <ul className={popup.kind === "worksheet" ? "grid gap-3 sm:grid-cols-2" : "grid gap-2"}>
            {(popup.kind === "worksheet" ? popup.area.worksheets : popup.area.ketentuan).map((r) => (
              <MaterialRow key={r.id} r={r} large={popup.kind === "worksheet"} onBeforeOpen={() => setPopup(null)} />
            ))}
          </ul>
        )}
        <div className="mt-3">
          <SimulationNote>Berkas demo buatan SEKAR — isi dan nomor ketentuan fiktif, bukan dokumen resmi.</SimulationNote>
        </div>
      </Modal>
    </div>
  );
}

/** Satu materi dengan tombol pratinjau & unduh. */
function MaterialRow({ r, large, compact, onBeforeOpen }: { r: Reference; large?: boolean; compact?: boolean; onBeforeOpen?: () => void }) {
  const { openDocument, downloadDocument } = useReadySekar();
  const isWs = r.kind === "worksheet";
  const Icon = isWs ? FileSpreadsheet : FileText;
  const heading = r.subkind && MATERIAL_LONG_LABEL[r.subkind] ? MATERIAL_LONG_LABEL[r.subkind] : r.subkind && MATERIAL_LABEL[r.subkind] ? MATERIAL_LABEL[r.subkind] : clean(r.title);
  const preview = () => {
    onBeforeOpen?.();
    openDocument(r.document_id);
  };
  return (
    <li className={large ? "flex flex-col rounded-xl border border-line p-4" : "flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5"}>
      <span className={large ? "flex items-start gap-3" : "flex min-w-0 items-center gap-3"}>
        <span className={isWs ? "grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e7f3ec] text-[#2e7d5b]" : "grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#fdecec] text-[#b23b3b]"}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block font-bold text-navy-900">
            {compact ? clean(r.title) : heading}
            {!compact && !isWs && <Badge tone="blue" className="ml-2 align-middle">{materialLabel(r)}</Badge>}
          </span>
          <span className={large ? "mt-1 block text-[13px] text-muted" : "block truncate text-[12.5px] text-muted"}>{compact ? r.area : isWs ? r.description : clean(r.title)}</span>
        </span>
      </span>
      <span className={large ? "mt-4 flex gap-2" : "flex shrink-0 gap-1.5"}>
        <Button size="sm" onClick={preview} aria-label={`Pratinjau ${clean(r.title)}`}>
          <Eye className="h-4 w-4" aria-hidden />
          {large || !compact ? "Pratinjau" : "Buka"}
        </Button>
        <Button size="sm" variant="primary" onClick={() => downloadDocument(r.document_id)} aria-label={`Unduh ${clean(r.title)}`}>
          <Download className="h-4 w-4" aria-hidden />
          {isWs ? "Excel" : "PDF"}
        </Button>
      </span>
    </li>
  );
}
