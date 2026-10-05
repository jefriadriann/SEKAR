"use client";

import { useMemo, useState } from "react";
import { BookOpen, Download, FileSpreadsheet, GraduationCap, Info, ListChecks, Scale } from "lucide-react";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, Button, Card, EmptyState, PageHeader, SearchField, SectionHeader, SelectField, SimulationNote } from "@/components/ui/primitives";
import { ALL, matchesSearch, uniqueSorted } from "@/lib/analytics/common";
import { REFERENCE_KIND_LABEL } from "@/lib/format";
import { REFERENCE_KINDS, type Reference, type ReferenceKind } from "@/lib/types";

const KIND_ICON = { worksheet: FileSpreadsheet, ketentuan: Scale, tutorial: GraduationCap } as const;

/** Langkah tutorial generik (simulasi) — tidak ada video; ditampilkan sebagai panduan langkah demi langkah. */
export function tutorialSteps(area: string): string[] {
  return [
    `Buka kartu area ${area} pada halaman SGo dan Ketentuan.`,
    "Unduh worksheet simulasi dan isi identitas unit serta periode pemeriksaan.",
    "Baca materi ketentuan simulasi untuk memahami aspek yang diperiksa.",
    `Cocokkan temuan area ${area} di modul Hasil Pemeriksaan dengan butir worksheet.`,
    "Catat tindak lanjut dan lampirkan bukti pada temuan terkait.",
    "Periksa kembali tenggat di modul Jadwal Pemeriksaan sebelum menyampaikan dokumen.",
  ];
}

export function SgoView() {
  const { data, openDocument, downloadDocument } = useReadySekar();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<ReferenceKind | typeof ALL>(ALL);
  const [tutorial, setTutorial] = useState<Reference | null>(null);
  const areas = useMemo(() => uniqueSorted(data.references.map((r) => r.area)), [data.references]);
  const results = data.references.filter((r) => (kind === ALL || r.kind === kind) && matchesSearch(search, r.title, r.area, r.description, r.kind));
  const isSearching = search.trim() !== "" || kind !== ALL;

  const open = (r: Reference) => (r.kind === "tutorial" ? setTutorial(r) : openDocument(r.document_id));

  return (
    <div>
      <PageHeader
        eyebrow="Materi bersama"
        title="SGo dan Ketentuan"
        description="Worksheet, ketentuan dan tutorial per area pemeriksaan. Seluruh materi berlabel simulasi dan bukan ketentuan resmi."
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="apa-sgo" className="bg-gradient-to-br from-white to-sky-50">
          <SectionHeader id="apa-sgo" icon={<Info className="h-5 w-5 text-sky-700" aria-hidden />} title="Apa itu SGo?" />
          <p className="text-[15px] text-navy-900">
            Dalam demo ini, SGo diperlakukan sebagai ruang materi panduan pemeriksaan: kumpulan worksheet, ketentuan dan tutorial yang dikelompokkan per
            area agar KPw dan DR merujuk materi yang sama saat menindaklanjuti temuan.
          </p>
          <p className="mt-2 text-sm text-muted">Definisi dan rujukan resmi mengikuti ketentuan internal yang berlaku. Tidak ada nomor ketentuan resmi yang dicantumkan di sini.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="amber">SIMULASI</Badge>
            <Badge tone="blue">{areas.length} area</Badge>
            <Badge tone="teal">{data.references.length} materi</Badge>
          </div>
        </Card>
        <Card aria-labelledby="tutorial-umum">
          <SectionHeader id="tutorial-umum" icon={<ListChecks className="h-5 w-5 text-violet-700" aria-hidden />} title="Tutorial: memakai halaman ini" />
          <ol className="list-decimal space-y-1.5 pl-5 text-[15px] text-navy-900">
            <li>Cari materi dengan kata kunci atau saring berdasarkan jenis.</li>
            <li>Pilih kartu area, lalu klik Worksheet atau Ketentuan untuk pratinjau.</li>
            <li>Klik Tutorial untuk panduan langkah demi langkah (tanpa video).</li>
            <li>Unduh materi sebagai berkas .txt simulasi dari panel pratinjau.</li>
          </ol>
        </Card>
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <SearchField id="sgo-search" label="Cari materi" value={search} onChange={setSearch} placeholder="Contoh: Pengadaan, worksheet…" />
          <SelectField
            id="sgo-kind"
            label="Jenis materi"
            value={kind}
            onChange={setKind}
            options={[{ value: ALL, label: "Semua jenis" }, ...REFERENCE_KINDS.map((k) => ({ value: k, label: REFERENCE_KIND_LABEL[k] }))]}
          />
        </div>
      </Card>

      {isSearching ? (
        <Card aria-labelledby="hasil-cari">
          <SectionHeader id="hasil-cari" title={`Hasil pencarian (${results.length})`} actions={<Button size="sm" onClick={() => { setSearch(""); setKind(ALL); }}>Reset pencarian</Button>} />
          {results.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {results.map((r) => {
                const Icon = KIND_ICON[r.kind];
                return (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="h-5 w-5 shrink-0 text-navy-600" aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{r.title}</span>
                        <span className="text-xs text-muted">{r.area}</span>
                      </span>
                    </span>
                    <Button size="sm" onClick={() => open(r)}>
                      Buka
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Materi tidak ditemukan" description="Coba kata kunci lain atau hapus filter jenis." />
          )}
        </Card>
      ) : (
        <section aria-labelledby="grid-area">
          <h2 id="grid-area" className="mb-3 text-lg font-bold text-navy-900">
            Area pemeriksaan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {areas.map((area, i) => {
              const refs = data.references.filter((r) => r.area === area);
              return (
                <article key={area} className="flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:border-sky-300 hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 font-bold text-white" aria-hidden>
                      {i + 1}
                    </span>
                    <h3 className="font-bold text-navy-900">{area}</h3>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-muted">{refs[0]?.description ?? "Materi simulasi."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {REFERENCE_KINDS.map((k) => {
                      const ref = refs.find((r) => r.kind === k);
                      const Icon = KIND_ICON[k];
                      return (
                        <Button key={k} size="sm" variant={k === "worksheet" ? "primary" : "secondary"} disabled={!ref} onClick={() => ref && open(ref)}>
                          <Icon className="h-4 w-4" aria-hidden />
                          {REFERENCE_KIND_LABEL[k]}
                          <span className="sr-only"> {area}</span>
                        </Button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <Drawer
        open={!!tutorial}
        onClose={() => setTutorial(null)}
        title={tutorial?.title ?? "Tutorial"}
        subtitle={
          <span className="flex items-center gap-2">
            <Badge tone="amber">SIMULASI</Badge> Panduan langkah demi langkah (tanpa video)
          </span>
        }
        footer={
          tutorial && (
            <>
              <Button onClick={() => setTutorial(null)}>Tutup</Button>
              <Button variant="primary" onClick={() => downloadDocument(tutorial.document_id)}>
                <Download className="h-4 w-4" aria-hidden />
                Unduh .txt simulasi
              </Button>
            </>
          )
        }
      >
        {tutorial && (
          <div className="space-y-4">
            <SimulationNote>{data.documents.find((d) => d.id === tutorial.document_id)?.content_text ?? "Materi simulasi."}</SimulationNote>
            <ol className="space-y-3">
              {tutorialSteps(tutorial.area).map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-800" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-[15px] text-navy-900">
                    <span className="sr-only">Langkah {i + 1}: </span>
                    {s}
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              {data.references
                .filter((r) => r.area === tutorial.area && r.kind !== "tutorial")
                .map((r) => (
                  <Button key={r.id} size="sm" onClick={() => openDocument(r.document_id)}>
                    <BookOpen className="h-4 w-4" aria-hidden />
                    {REFERENCE_KIND_LABEL[r.kind]} {r.area}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
