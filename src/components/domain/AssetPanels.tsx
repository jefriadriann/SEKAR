"use client";

/**
 * Panel aset: rekonsiliasi aset dengan rincian asesmen per nomor aset, serta
 * pilihan video panduan pencatatan aset (pop-up yang langsung diputar).
 */
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  BookOpen,
  Calculator,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Hourglass,
  PlayCircle,
  Shuffle,
  Split,
  Tags,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { AutoplayVideo } from "@/components/domain/MaterialViewer";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { Badge, Button, cx, DescriptionList, EmptyState, SearchField, SelectField, SimulationNote } from "@/components/ui/primitives";
import { FindingStatusBadge } from "@/components/ui/StatusBadges";
import {
  assetChecklist,
  filterAssets,
  groupAssets,
  issuesByAspect,
  reconciliationRate,
  summarizeAssets,
  type AssessedAsset,
  type AssetItemFilters,
} from "@/lib/analytics/assets";
import { formatDate } from "@/lib/dates";
import { ASSET_ACTION_LABEL, ASSET_ASPECT_LABEL, clean, FINDING_STATUS_LABEL, formatNumber, formatPercent, formatRupiah } from "@/lib/format";
import { findVideo, materialLabel } from "@/lib/materials";
import { ASSET_ACTIONS, FINDING_STATUSES, type AssetAction, type AssetAspect, type AssetItem, type AssetReconciliation, type Reference } from "@/lib/types";

export const ASSET_ACTION_ICON: Record<AssetAction, LucideIcon> = {
  split: Split,
  penghapusan: Trash2,
  penatausahaan: Tags,
  mutasi: ArrowLeftRight,
  reklasifikasi: Shuffle,
  koreksi_nilai: Calculator,
  penyesuaian_umur: Hourglass,
  inventarisasi: ClipboardCheck,
};

/** Pop-up video panduan yang langsung diputar. */
export function VideoPopup({ video, onClose }: { video: Reference | null; onClose: () => void }) {
  const { data } = useReadySekar();
  const doc = video ? data.documents.find((d) => d.id === video.document_id) : null;
  const steps = doc ? doc.content_text.split("\n").slice(1).filter(Boolean) : [];
  return (
    <Modal
      open={!!video && !!doc?.file_url}
      onClose={onClose}
      role="dialog"
      size="max-w-3xl"
      title={video ? clean(video.title) : "Video"}
      subtitle={
        <span className="flex items-center gap-2">
          <Badge tone="amber">SIMULASI</Badge>
          {video?.description}
        </span>
      }
    >
      {doc?.file_url && <AutoplayVideo src={doc.file_url} title={clean(doc.title)} />}
      {steps.length > 0 && (
        <ol className="mt-3 grid gap-1.5 text-[14px] sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s} className="rounded-lg bg-[#f4f6fb] px-3 py-1.5 text-navy-900">
              {s}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

/** Drawer pilihan video pencatatan aset: klik salah satu → pop-up video autoplay. */
export function AssetVideoDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, openDocument } = useReadySekar();
  const [playing, setPlaying] = useState<Reference | null>(null);
  const videos = ASSET_ACTIONS.map((a) => findVideo(data.references, a)).filter((r): r is Reference => !!r);
  const refs = data.references.filter((r) => r.area === "Aset" && r.kind !== "tutorial");
  return (
    <>
      <Drawer open={open} onClose={onClose} title="Video Panduan Pencatatan Aset" subtitle="Pilih topik — video langsung diputar dalam pop-up" width="max-w-2xl">
        <ul className="grid gap-3 sm:grid-cols-2">
          {videos.map((v) => {
            const Icon = ASSET_ACTION_ICON[v.subkind as AssetAction] ?? PlayCircle;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setPlaying(v)}
                  className="group flex h-full w-full items-start gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-[#b9c8e0] hover:shadow-md"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef2f9] text-[#1d4f9e] group-hover:bg-[#1d4f9e] group-hover:text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-navy-900">{ASSET_ACTION_LABEL[v.subkind as AssetAction] ?? clean(v.title)}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">{v.description}</span>
                  </span>
                  <PlayCircle className="mt-1 h-5 w-5 shrink-0 text-[#c4323b]" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        <h3 className="mt-6 flex items-center gap-2 font-bold text-navy-900">
          <BookOpen className="h-4 w-4 text-brand" aria-hidden />
          Materi area Aset
        </h3>
        <ul className="mt-2 space-y-2">
          {refs.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
              <span className="min-w-0 truncate font-semibold text-navy-900">{clean(r.title)}</span>
              <Button size="sm" onClick={() => openDocument(r.document_id)}>
                {materialLabel(r)}
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <SimulationNote>Video dan materi adalah contoh simulasi, bukan ketentuan resmi.</SimulationNote>
        </div>
      </Drawer>
      <VideoPopup video={playing} onClose={() => setPlaying(null)} />
    </>
  );
}

/**
 * Rekonsiliasi aset bertingkat:
 *   1. rekap per satker/tahun (dilewati bila hanya satu rekonsiliasi),
 *   2. daftar aset tidak sesuai beserta nomor aset dan aspek ketidaksesuaian,
 *   3. detail asesmen satu aset (daftar periksa seluruh aspek + tindak lanjut + video).
 */
export function AssetReconDrawer({
  open,
  onClose,
  recs,
  items,
  unitName,
  title = "Hasil Rekonsiliasi Aset",
}: {
  open: boolean;
  onClose: () => void;
  recs: AssetReconciliation[];
  items: AssetItem[];
  unitName: (id: string) => string;
  title?: string;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [assetKey, setAssetKey] = useState<string | null>(null);
  const [video, setVideo] = useState<Reference | null>(null);
  const single = recs.length === 1 ? recs[0].id : null;
  const recId = picked ?? single;
  const rec = recs.find((r) => r.id === recId) ?? null;
  const close = () => {
    setPicked(null);
    setAssetKey(null);
    onClose();
  };

  const assets = useMemo(() => (rec ? groupAssets(items.filter((i) => i.reconciliation_id === rec.id)) : []), [rec, items]);
  const asset = assets.find((a) => a.key === assetKey) ?? null;

  return (
    <>
      <Drawer
        open={open}
        onClose={close}
        title={asset ? `${asset.asset_name}` : rec ? `${title} · ${unitName(rec.unit_id)} ${rec.year}` : title}
        subtitle={asset ? `Nomor aset ${asset.asset_number}` : rec ? "Daftar aset dengan hasil asesmen tidak sesuai" : "Rekap per satuan kerja sesuai filter aktif — pilih baris untuk melihat daftar aset"}
        width="max-w-4xl"
      >
        {(asset || (rec && !single)) && (
          <Button size="sm" variant="ghost" className="mb-3 -ml-2" onClick={() => (asset ? setAssetKey(null) : setPicked(null))}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {asset ? "Kembali ke daftar aset" : "Kembali ke rekap"}
          </Button>
        )}
        {asset ? (
          <AssetDetail asset={asset} onPlay={setVideo} />
        ) : rec ? (
          <AssetList key={rec.id} rec={rec} assets={assets} onOpen={(a) => setAssetKey(a.key)} />
        ) : (
          <ReconSummary recs={recs} items={items} unitName={unitName} onOpen={(r) => setPicked(r.id)} />
        )}
      </Drawer>
      <VideoPopup video={video} onClose={() => setVideo(null)} />
    </>
  );
}

function Stats({ items }: { items: [string, string][] }) {
  return (
    <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-[#eef5fd] px-3 py-2">
          <dt className="text-[12px] font-semibold text-muted">{k}</dt>
          <dd className="text-lg font-bold text-navy-900 tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReconSummary({ recs, items, unitName, onOpen }: { recs: AssetReconciliation[]; items: AssetItem[]; unitName: (id: string) => string; onOpen: (r: AssetReconciliation) => void }) {
  const s = summarizeAssets(recs);
  const detailed = useMemo(() => new Set(items.map((i) => i.reconciliation_id)), [items]);
  const columns: Column<AssetReconciliation>[] = [
    { key: "unit", header: "Satuan kerja", render: (a) => <span className="font-semibold">{unitName(a.unit_id)}</span>, sortValue: (a) => unitName(a.unit_id) },
    { key: "year", header: "Tahun", render: (a) => a.year, sortValue: (a) => a.year },
    { key: "total", header: "Total item", className: "text-right tabular-nums", render: (a) => formatNumber(a.total_items), sortValue: (a) => a.total_items },
    { key: "rec", header: "Sesuai", className: "text-right tabular-nums", render: (a) => formatNumber(a.reconciled_items), sortValue: (a) => a.reconciled_items },
    { key: "disc", header: "Tidak sesuai", className: "text-right tabular-nums", render: (a) => formatNumber(a.discrepancy_items), sortValue: (a) => a.discrepancy_items },
    { key: "rate", header: "% sesuai", className: "text-right tabular-nums", render: (a) => formatPercent(reconciliationRate(a), 1), sortValue: (a) => reconciliationRate(a) },
    {
      key: "detail",
      header: "Rincian",
      render: (a) => (detailed.has(a.id) ? <Badge tone="blue">Per aset</Badge> : <Badge tone="neutral">Rekap</Badge>),
      sortValue: (a) => (detailed.has(a.id) ? 1 : 0),
    },
  ];
  return (
    <>
      <Stats items={[["Satuan kerja", formatNumber(s.units)], ["Total item", formatNumber(s.totalItems)], ["Tidak sesuai", formatNumber(s.discrepancy)], ["% sesuai", formatPercent(s.pctReconciled, 1)]]} />
      <DataTable
        rows={recs}
        columns={columns}
        rowKey={(a) => a.id}
        caption="Rekonsiliasi aset per satuan kerja"
        onRowOpen={onOpen}
        openColumnKey="unit"
        initialSort={{ key: "disc", dir: "desc" }}
        dense
        minWidth={620}
        emptyTitle="Tidak ada data rekonsiliasi"
        emptyDescription="Ubah filter tahun atau satuan kerja."
      />
    </>
  );
}

const ALL_FILTERS: AssetItemFilters = { aspect: "all", status: "all", search: "" };

function AssetList({ rec, assets, onOpen }: { rec: AssetReconciliation; assets: AssessedAsset[]; onOpen: (a: AssessedAsset) => void }) {
  const [f, setF] = useState<AssetItemFilters>(ALL_FILTERS);
  const allIssues = assets.flatMap((a) => a.issues);
  const byAspect = issuesByAspect(allIssues).filter((c) => c.count > 0);
  const shown = filterAssets(assets, f);
  const columns: Column<AssessedAsset>[] = [
    {
      key: "no",
      header: "Nomor aset",
      render: (a) => (
        <span>
          <span className="block font-mono text-[12.5px] font-semibold text-navy-900">{a.asset_number}</span>
          <span className="text-[12.5px] text-navy-900">{a.asset_name}</span>
        </span>
      ),
      sortValue: (a) => a.asset_number,
    },
    {
      key: "cat",
      header: "Kategori / Lokasi",
      render: (a) => (
        <span className="text-[12.5px]">
          <span className="block">{a.category}</span>
          <span className="text-muted">{a.location}</span>
        </span>
      ),
      sortValue: (a) => a.category,
    },
    { key: "cost", header: "Harga perolehan", className: "text-right tabular-nums whitespace-nowrap", render: (a) => formatRupiah(a.acquisition_cost), sortValue: (a) => a.acquisition_cost },
    {
      key: "issues",
      header: "Asesmen tidak sesuai",
      className: "min-w-[200px]",
      render: (a) => (
        <span className="flex flex-wrap gap-1">
          {a.issues.map((i) => (
            <Badge key={i.id} tone="rose">
              {ASSET_ASPECT_LABEL[i.aspect]}
            </Badge>
          ))}
        </span>
      ),
      sortValue: (a) => a.issues.length,
    },
    { key: "status", header: "Tindak lanjut", render: (a) => <FindingStatusBadge status={a.status} />, sortValue: (a) => a.status },
  ];

  if (!assets.length)
    return (
      <>
        <Stats items={[["Total item", formatNumber(rec.total_items)], ["Sesuai", formatNumber(rec.reconciled_items)], ["Tidak sesuai", formatNumber(rec.discrepancy_items)], ["% sesuai", formatPercent(reconciliationRate(rec), 1)]]} />
        <EmptyState title="Rincian per aset belum tersedia" description={`Rekonsiliasi ${rec.year} hanya berupa rekap. Rincian asesmen per nomor aset tersedia untuk 2025–2026 (DR: 2023–2026).`} />
      </>
    );

  return (
    <>
      <Stats items={[["Total item", formatNumber(rec.total_items)], ["Sesuai", formatNumber(rec.reconciled_items)], ["Aset tidak sesuai", formatNumber(assets.length)], ["% sesuai", formatPercent(reconciliationRate(rec), 1)]]} />
      <section aria-labelledby="aspek-tidak-sesuai" className="mb-4">
        <h3 id="aspek-tidak-sesuai" className="mb-2 text-[14px] font-bold text-navy-900">
          Ketidaksesuaian per aspek asesmen <span className="font-normal text-muted">(klik untuk menyaring)</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {byAspect.map((c) => {
            const active = f.aspect === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={active}
                onClick={() => setF((x) => ({ ...x, aspect: active ? "all" : (c.key as AssetAspect) }))}
                className={cx(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors",
                  active ? "border-[#1d4f9e] bg-[#1d4f9e] text-white" : "border-line bg-white text-navy-900 hover:border-sky-300 hover:bg-sky-50",
                )}
              >
                {ASSET_ASPECT_LABEL[c.key as AssetAspect]}
                <span className={cx("rounded-full px-1.5 text-[12px] tabular-nums", active ? "bg-white/20" : "bg-[#fde8e8] text-[#b23b3b]")}>{c.count}</span>
              </button>
            );
          })}
        </div>
      </section>
      <DataTable
        rows={shown}
        columns={columns}
        rowKey={(a) => a.key}
        caption="Daftar aset dengan hasil asesmen tidak sesuai"
        onRowOpen={onOpen}
        openColumnKey="no"
        initialSort={{ key: "issues", dir: "desc" }}
        dense
        minWidth={760}
        unitLabel="aset"
        emptyTitle="Tidak ada aset yang cocok"
        emptyAction={<Button onClick={() => setF(ALL_FILTERS)}>Reset filter</Button>}
        toolbar={
          <div className="flex flex-wrap items-end gap-2">
            <SearchField id="asset-q" label="Cari nomor/nama aset" hideLabel value={f.search} onChange={(v) => setF((x) => ({ ...x, search: v }))} placeholder="Cari nomor aset, nama, lokasi..." />
            <SelectField
              id="asset-status"
              label="Status tindak lanjut"
              hideLabel
              className="w-[200px]"
              value={f.status}
              onChange={(v) => setF((x) => ({ ...x, status: v }))}
              options={[{ value: "all", label: "Semua status" }, ...FINDING_STATUSES.map((s) => ({ value: s, label: FINDING_STATUS_LABEL[s] }))]}
            />
          </div>
        }
      />
    </>
  );
}

function AssetDetail({ asset, onPlay }: { asset: AssessedAsset; onPlay: (r: Reference) => void }) {
  const { data } = useReadySekar();
  const checks = assetChecklist(asset);
  return (
    <div className="space-y-4">
      <DescriptionList
        items={[
          { term: "Nomor aset", value: <span className="font-mono">{asset.asset_number}</span> },
          { term: "Kategori", value: asset.category },
          { term: "Lokasi tercatat", value: asset.location },
          { term: "Tanggal perolehan", value: formatDate(asset.acquisition_date) },
          { term: "Harga perolehan tercatat", value: formatRupiah(asset.acquisition_cost) },
          { term: "Umur ekonomis tercatat", value: `${asset.useful_life} tahun` },
          { term: "Status tindak lanjut", value: <FindingStatusBadge status={asset.status} /> },
        ]}
      />
      <section aria-labelledby="asesmen-aset">
        <h3 id="asesmen-aset" className="mb-2 font-bold text-navy-900">
          Hasil asesmen per aspek{" "}
          <span className="font-normal text-muted">
            ({asset.issues.length} tidak sesuai dari {checks.length} aspek)
          </span>
        </h3>
        <ul className="space-y-2">
          {checks.map(({ aspect, ok, issue }) => {
            const video = issue ? findVideo(data.references, issue.action) : null;
            return (
              <li key={aspect} className={cx("rounded-xl border px-3 py-2.5", ok ? "border-line bg-white" : "border-[#f1c4c4] bg-[#fff6f6]")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold text-navy-900">
                    {ok ? <CircleCheck className="h-5 w-5 text-[#2e7d5b]" aria-hidden /> : <CircleX className="h-5 w-5 text-[#b23b3b]" aria-hidden />}
                    {ASSET_ASPECT_LABEL[aspect]}
                  </span>
                  {ok ? <Badge tone="teal">Sesuai</Badge> : <Badge tone="rose">Tidak sesuai</Badge>}
                </div>
                {issue && (
                  <div className="mt-2 space-y-2 pl-7 text-[14px]">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-[#f1c4c4]">
                        <dt className="text-[12px] font-semibold text-muted">Tercatat</dt>
                        <dd className="text-navy-900">{issue.recorded_value}</dd>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-[#cfe3d6]">
                        <dt className="text-[12px] font-semibold text-muted">Seharusnya / hasil asesmen</dt>
                        <dd className="text-navy-900">{issue.expected_value}</dd>
                      </div>
                    </dl>
                    <p className="text-navy-900">
                      <span className="font-semibold">Penyebab: </span>
                      {clean(issue.note)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted">Tindak lanjut:</span>
                      <Badge tone="blue">{ASSET_ACTION_LABEL[issue.action]}</Badge>
                      <FindingStatusBadge status={issue.status} />
                      {video && (
                        <Button size="sm" onClick={() => onPlay(video)}>
                          <PlayCircle className="h-4 w-4 text-[#c4323b]" aria-hidden />
                          Tonton video {ASSET_ACTION_LABEL[issue.action]}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <SimulationNote>Hasil asesmen aset adalah data simulasi.</SimulationNote>
    </div>
  );
}
