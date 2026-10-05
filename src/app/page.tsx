"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Building2, CalendarRange, ClipboardCheck, FileStack, ShieldCheck } from "lucide-react";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { Badge } from "@/components/ui/primitives";
import { summarizeFindings } from "@/lib/analytics/findings";
import { summarizeRequests } from "@/lib/analytics/permindok";
import { scheduleKpis } from "@/lib/analytics/schedules";
import { formatDateLong } from "@/lib/dates";
import { formatNumber, formatPercent, ROLE_LABEL } from "@/lib/format";
import { kpwModuleData } from "@/lib/scope";

function HeroArt() {
  // Dekorasi abstrak (gedung & pola kepulauan). Bukan peta dan tidak mewakili data geografis.
  return (
    <svg viewBox="0 0 420 260" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hg1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#67e8f9" stopOpacity="0.9" />
          <stop offset="1" stopColor="#2563eb" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="hg2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e0f2fe" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <g fill="#ffffff" fillOpacity="0.28">
        <ellipse cx="70" cy="205" rx="46" ry="10" />
        <ellipse cx="160" cy="222" rx="30" ry="7" />
        <ellipse cx="255" cy="214" rx="40" ry="9" />
        <ellipse cx="345" cy="226" rx="34" ry="8" />
        <ellipse cx="395" cy="208" rx="16" ry="5" />
      </g>
      <rect x="130" y="70" width="160" height="130" rx="6" fill="url(#hg2)" />
      <polygon points="120,72 210,28 300,72" fill="url(#hg1)" />
      <rect x="120" y="70" width="180" height="10" rx="2" fill="#0b2545" fillOpacity="0.85" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={142 + i * 25} y="88" width="11" height="96" rx="3" fill="#93c5fd" />
      ))}
      <rect x="120" y="196" width="180" height="10" rx="2" fill="#0b2545" fillOpacity="0.85" />
      <circle cx="350" cy="60" r="26" fill="#fde68a" fillOpacity="0.85" />
      <g stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2" fill="none">
        <path d="M20 150 Q 70 120 120 150" />
        <path d="M300 150 Q 350 120 400 150" />
      </g>
    </svg>
  );
}

export default function HomePage() {
  const { data, viewer, asOf } = useReadySekar();
  const kpw = kpwModuleData(data);
  const f = summarizeFindings(kpw.findings, asOf);
  const r = summarizeRequests(kpw.document_requests, asOf);
  const s = scheduleKpis(kpw.audit_schedules, asOf);
  const areas = new Set(data.references.map((x) => x.area)).size;

  const cards = [
    {
      href: "/hasil-pemeriksaan",
      title: "Hasil Pemeriksaan KPwDN",
      desc: "Temuan BPK, DAI dan KAA per area, korwil dan tahun beserta rekomendasi, tenggat, bukti, dan rekonsiliasi aset.",
      icon: ClipboardCheck,
      accent: "from-sky-500 to-blue-700",
      stats: [
        { label: "Temuan", value: formatNumber(f.total) },
        { label: "KPw terdampak", value: formatNumber(f.uniqueUnits) },
        { label: "Selesai", value: formatPercent(f.pctSelesai) },
      ],
    },
    {
      href: "/permindok",
      title: "Tracker Permindok",
      desc: "Pantau permintaan dokumen: kelengkapan, ketepatan waktu penyampaian, catatan DR, dan tanda terima simulasi.",
      icon: FileStack,
      accent: "from-teal-500 to-cyan-700",
      stats: [
        { label: "Permintaan", value: formatNumber(r.total) },
        { label: "Lengkap", value: formatNumber(r.byStatus.lengkap) },
        { label: "Lewat tenggat", value: formatNumber(r.byTimeliness.lewat_tenggat) },
      ],
    },
    {
      href: "/jadwal-pemeriksaan",
      title: "Jadwal Pemeriksaan",
      desc: "Timeline pemeriksaan per bulan, kuartal dan tahun dengan garis hari ini, label tentatif, dan tindak lanjut temuan.",
      icon: CalendarRange,
      accent: "from-violet-500 to-indigo-700",
      stats: [
        { label: "Jadwal", value: formatNumber(s.total) },
        { label: "Berlangsung", value: formatNumber(s.berlangsung) },
        { label: "Mulai ≤ 7 hari", value: formatNumber(s.mulai7Hari) },
      ],
    },
    {
      href: "/sgo-ketentuan",
      title: "SGo dan Ketentuan",
      desc: "Materi worksheet, ketentuan dan tutorial langkah demi langkah untuk delapan area pemeriksaan (materi simulasi).",
      icon: BookOpen,
      accent: "from-amber-400 to-orange-600",
      stats: [
        { label: "Area", value: formatNumber(areas) },
        { label: "Materi", value: formatNumber(data.references.length) },
        { label: "Jenis", value: "3" },
      ],
    },
  ] as const;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-cyan-600 to-blue-800 px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" aria-hidden />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-100">Bank Indonesia | Departemen Regional</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">SEKAR</h1>
            <p className="mt-2 text-xl font-semibold text-sky-50">Sistem Informasi Evaluasi Kepatuhan, Audit &amp; Risiko</p>
            <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-sky-50">
              Satu ruang kerja untuk memantau hasil pemeriksaan, permintaan dokumen, jadwal pemeriksaan, dan materi ketentuan di seluruh Kantor
              Perwakilan dalam negeri.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
                Persona: {ROLE_LABEL[viewer.role]} — {viewer.name}
                {viewer.simulated && " (simulasi)"}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">Tanggal acuan: {formatDateLong(asOf)}</span>
              <span className="rounded-full bg-amber-300 px-3 py-1 font-bold text-navy-950">Data simulasi — 46 KPw fiktif</span>
            </div>
          </div>
          <div className="mx-auto hidden h-56 w-full max-w-md md:block">
            <HeroArt />
          </div>
        </div>
      </section>

      <section aria-labelledby="modul">
        <h2 id="modul" className="sr-only">
          Modul utama
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg sm:p-7"
            >
              <div className="flex items-start gap-4">
                <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c.accent} text-white`} aria-hidden>
                  <c.icon className="h-7 w-7" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-navy-900">{c.title}</h3>
                  <p className="mt-1 text-[15px] text-muted">{c.desc}</p>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-4">
                {c.stats.map((st) => (
                  <div key={st.label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{st.label}</dt>
                    <dd className="text-2xl font-bold text-navy-900 tabular-nums">{st.value}</dd>
                  </div>
                ))}
              </dl>
              <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-sky-700 group-hover:text-navy-900">
                Buka modul <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {(viewer.role === "dr" || viewer.role === "admin") && (
        <section aria-label="Akses khusus" className="grid gap-4 md:grid-cols-2">
          <Link href="/dr" className="flex items-center gap-4 rounded-2xl border border-line bg-gradient-to-r from-sky-50 to-cyan-50 p-5 hover:border-sky-300">
            <Building2 className="h-8 w-8 text-navy-700" aria-hidden />
            <div>
              <p className="font-bold text-navy-900">Dashboard Departemen Regional</p>
              <p className="text-sm text-muted">Temuan, kepatuhan dan permindok khusus unit DR — terpisah dari modul KPw.</p>
            </div>
          </Link>
          {viewer.role === "admin" && (
            <Link href="/admin" className="flex items-center gap-4 rounded-2xl border border-line bg-gradient-to-r from-violet-50 to-sky-50 p-5 hover:border-violet-300">
              <ShieldCheck className="h-8 w-8 text-violet-700" aria-hidden />
              <div>
                <p className="font-bold text-navy-900">Admin dataset</p>
                <p className="text-sm text-muted">Import JSON dengan validasi, export, dan reset ke seed awal.</p>
              </div>
            </Link>
          )}
        </section>
      )}
      {viewer.role === "kpw" && (
        <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">
          <Badge tone="blue">Persona KPw</Badge> Tampilan dibatasi pada data {data.units[0]?.name ?? viewer.unit_id} dan materi bersama. Modul DR tidak tersedia.
        </p>
      )}
    </div>
  );
}
