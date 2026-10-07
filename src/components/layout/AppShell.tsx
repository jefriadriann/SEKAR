"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, Bell, CalendarClock, ChevronRight, Download, FlaskConical, Loader2, LogOut, RotateCcw, UserRound, X } from "lucide-react";
import { useSekar } from "@/components/providers/SekarProvider";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, Button, Card, cx, SimulationNote, Skeleton } from "@/components/ui/primitives";
import { findingTimeliness } from "@/lib/analytics/findings";
import { requestTimeliness } from "@/lib/analytics/permindok";
import { startsWithin } from "@/lib/analytics/schedules";
import { formatDate, formatDateLong } from "@/lib/dates";
import { ROLE_LABEL } from "@/lib/format";
import { canAccessRoute, kpwModuleData, type AppRoute } from "@/lib/scope";
import { NAV_ITEMS } from "./nav";

export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useSekar();
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <div className={cx("flex min-h-screen flex-col", isHome && "bg-gradient-to-br from-[#e6f2fd] via-[#f4f9fe] to-[#e9f3fc]")}>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:font-semibold"
      >
        Lewati ke konten
      </a>
      <Header home={isHome && status === "ready"} />
      <main id="konten" className={cx("flex-1", isHome && status === "ready" ? "" : "mx-auto w-full max-w-[1440px] px-4 pb-10 pt-4 sm:px-6 lg:px-8")}>
        {status === "ready" ? children : <StatusScreen />}
      </main>
      <Footer />
      <DocumentPreview />
      <Toasts />
    </div>
  );
}

/** Placeholder identitas berbasis teks — bukan logo resmi. */
export function IdentityPlaceholder({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" title="Placeholder identitas berbasis teks, bukan logo resmi">
      <div className="leading-none">
        <p className={cx("whitespace-nowrap font-serif font-bold tracking-wide text-navy-950", compact ? "text-[14px] sm:text-[17px]" : "text-[16px] sm:text-[20px]")}>BANK INDONESIA</p>
        <p className={cx("mt-1 hidden whitespace-nowrap font-semibold uppercase tracking-[0.08em] text-navy-900 sm:block", compact ? "text-[7.5px]" : "text-[8.5px]")}>Bank Sentral Republik Indonesia</p>
      </div>
      <span aria-hidden className={cx("w-px bg-navy-900/60", compact ? "h-8" : "h-9")} />
      <p className={cx("font-bold uppercase leading-tight text-navy-900", compact ? "text-[10px] sm:text-[11px]" : "text-[11px] sm:text-[12px]")}>
        Departemen
        <br />
        Regional
      </p>
    </div>
  );
}

function SkylineDecor() {
  // Dekorasi gedung abstrak (bukan foto/peta).
  return (
    <svg viewBox="0 0 600 80" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden focusable="false">
      <defs>
        <linearGradient id="sky-b" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#9cc6f0" stopOpacity="0.75" />
          <stop offset="1" stopColor="#dcecfb" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <g fill="url(#sky-b)">
        <rect x="190" y="18" width="70" height="62" />
        <rect x="262" y="6" width="54" height="74" />
        <rect x="318" y="26" width="80" height="54" />
        <rect x="400" y="12" width="46" height="68" />
        <rect x="448" y="34" width="60" height="46" />
      </g>
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1">
        {Array.from({ length: 14 }, (_, i) => (
          <line key={i} x1={196 + i * 22} y1="12" x2={196 + i * 22} y2="80" />
        ))}
      </g>
    </svg>
  );
}

function Header({ home }: { home: boolean }) {
  const { config, status } = useSekar();
  return (
    <header
      className={cx(
        "relative z-40",
        home ? "bg-transparent" : "overflow-hidden border-b border-white/60 bg-gradient-to-r from-[#d7e9fc] via-[#eef6ff] to-[#cfe3fa] shadow-[0_6px_20px_-12px_rgba(20,42,110,0.35)]",
      )}
    >
      {!home && (
        <>
          <SkylineDecor />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-[#1d58b5] via-[#449efe] to-[#22c3a6]" />
        </>
      )}
      <div className="relative mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" aria-label="SEKAR — kembali ke beranda" className="rounded-lg">
          <IdentityPlaceholder compact={!home} />
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {!home && (
            <div className="hidden text-right leading-tight md:block">
              <p className="text-[24px] font-extrabold tracking-wide text-navy-900">SEKAR</p>
              <p className="text-[11.5px] font-semibold text-navy-800">Sistem Informasi Evaluasi Kepatuhan, Audit &amp; Risiko</p>
            </div>
          )}
          {config.mode === "dummy" ? (
            <span className="hidden items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11.5px] font-bold text-amber-900 sm:inline-flex">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              Mode Demo — Data Simulasi
            </span>
          ) : (
            <span className="hidden rounded-full border border-teal-300 bg-teal-50 px-2.5 py-1 text-[11.5px] font-bold text-teal-900 sm:inline-flex">Mode Supabase</span>
          )}
          {status === "ready" && (
            <>
              <Notifications />
              <UserMenu />
            </>
          )}
        </div>
      </div>
      {config.mode === "dummy" && (
        <p className="relative mx-auto -mt-1 max-w-[1440px] px-4 pb-1.5 text-right text-[11px] font-bold text-amber-900 sm:hidden">Mode Demo — Data Simulasi</p>
      )}
    </header>
  );
}

/** Popover sederhana: tutup dengan klik di luar atau Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function Notifications() {
  const { data, asOf } = useSekar();
  const { open, setOpen, ref } = usePopover();
  const items = useMemo(() => {
    if (!data) return [];
    const kpw = kpwModuleData(data);
    const overdue = kpw.findings.filter((f) => findingTimeliness(f, asOf) === "lewat_tenggat").length;
    const reqLate = kpw.document_requests.filter((r) => requestTimeliness(r, asOf) === "lewat_tenggat").length;
    const soon = kpw.audit_schedules.filter((s) => startsWithin(s, asOf, 7)).length;
    return [
      { href: "/jadwal-pemeriksaan", label: `${soon} pemeriksaan mulai dalam 7 hari`, n: soon },
      { href: "/permindok", label: `${reqLate} permintaan dokumen lewat tenggat`, n: reqLate },
      { href: "/hasil-pemeriksaan", label: `${overdue} temuan lewat tenggat tindak lanjut`, n: overdue },
    ].filter((i) => i.n > 0);
  }, [data, asOf]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative grid h-10 w-10 place-items-center rounded-full text-navy-900 hover:bg-white/70"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {items.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" aria-hidden />}
        <span className="sr-only">Notifikasi ({items.length})</span>
      </button>
      {open && (
        <div className="panel absolute right-0 top-12 z-50 w-[300px] p-2">
          <p className="px-2 py-1.5 text-[13px] font-bold text-navy-900">Notifikasi per {formatDate(asOf)}</p>
          {items.length ? (
            <ul>
              {items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-[14px] text-navy-900 hover:bg-sky-50">
                    {i.label}
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-2 text-sm text-muted">Tidak ada notifikasi.</p>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { viewer, personas, setPersona, asOf, datasetAsOf, setAsOf, resetAsOf, config, signOut } = useSekar();
  const { open, setOpen, ref } = usePopover();
  if (!viewer) return null;
  const links = NAV_ITEMS.filter((n) => canAccessRoute(viewer.role, n.href));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-full p-0.5 hover:bg-white/70"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-slate-300 to-slate-400 text-white" aria-hidden>
          <UserRound className="h-5 w-5" />
        </span>
        <span className="sr-only">Menu pengguna: {viewer.name}</span>
      </button>
      {open && (
        <div className="panel absolute right-0 top-12 z-50 w-[320px] p-3 text-[14px]">
          <p className="font-bold text-navy-900">{viewer.name}</p>
          <p className="text-[12px] text-muted">
            Peran {ROLE_LABEL[viewer.role]}
            {viewer.simulated && " · persona simulasi, bukan login/keamanan"}
          </p>
          {config.mode === "dummy" && (
            <div className="mt-3">
              <label htmlFor="persona" className="text-[12px] font-semibold text-muted">
                Persona demo
              </label>
              <select
                id="persona"
                value={viewer.id}
                onChange={(e) => setPersona(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-line bg-white px-2 font-semibold text-navy-900"
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {ROLE_LABEL[p.role]} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-3">
            <label htmlFor="as-of" className="flex items-center gap-1 text-[12px] font-semibold text-muted">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Tanggal acuan simulasi
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="as-of"
                type="date"
                value={asOf}
                onChange={(e) => e.target.value && setAsOf(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-line bg-white px-2 text-navy-900"
              />
              {datasetAsOf && asOf !== datasetAsOf && (
                <Button size="sm" variant="ghost" onClick={resetAsOf} aria-label={`Kembali ke ${formatDate(datasetAsOf)}`}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                </Button>
              )}
            </div>
          </div>
          <nav aria-label="Menu" className="mt-3 border-t border-line pt-2">
            <ul>
              {links.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-semibold text-navy-900 hover:bg-sky-50">
                    <n.icon className="h-4 w-4 text-brand" aria-hidden />
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {config.mode === "supabase" && (
            <Button size="sm" className="mt-2 w-full" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" aria-hidden />
              Keluar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Footer() {
  const { datasetAsOf } = useSekar();
  return (
    <footer className="border-t border-white/70 bg-white/60 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-[12px] text-muted sm:px-6 lg:px-8">
        <p>© SEKAR · Departemen Regional</p>
        <p>Data simulasi{datasetAsOf ? ` · posisi ${formatDateLong(datasetAsOf)}` : ""} · identitas berupa placeholder teks</p>
      </div>
    </footer>
  );
}

function StatusScreen() {
  const { status, error, retry, config } = useSekar();
  if (status === "loading") {
    return (
      <div role="status" aria-live="polite" className="space-y-4 pt-4">
        <p className="flex items-center gap-2 font-semibold text-navy-800">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Memuat dataset {config.mode === "dummy" ? "simulasi" : "dari Supabase"}…
        </p>
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (status === "needs_login") return <LoginScreen />;
  if (status === "unmapped") {
    return (
      <Card className="mx-auto mt-8 max-w-xl">
        <h1 className="text-xl font-bold text-navy-900">Akun belum memiliki akses</h1>
        <p className="mt-2 text-muted">
          Anda berhasil masuk, tetapi akun ini belum dipetakan ke peran dan unit oleh admin. Akun baru tidak otomatis mendapat akses. Hubungi admin
          SEKAR untuk menambahkan baris di tabel <code>user_access</code>.
        </p>
        <SignOutButton />
      </Card>
    );
  }
  return (
    <Card className="mx-auto mt-8 max-w-2xl border-rose-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-700" aria-hidden />
        <div>
          <h1 className="text-xl font-bold text-navy-900">{status === "config_error" ? "Konfigurasi belum lengkap" : "Data gagal dimuat"}</h1>
          <p role="alert" className="mt-2 text-navy-900">
            {error}
          </p>
          <p className="mt-2 text-sm text-muted">
            Aplikasi tidak beralih diam-diam ke data dummy. Periksa variabel lingkungan (lihat <code>.env.example</code> dan README), atau set{" "}
            <code>APP_DATA_MODE=dummy</code> untuk demo tanpa backend.
          </p>
          {status === "error" && (
            <Button className="mt-3" onClick={retry}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Coba lagi
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function SignOutButton() {
  const { signOut, retry } = useSekar();
  return (
    <Button
      className="mt-4"
      onClick={async () => {
        await signOut();
        retry();
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Keluar
    </Button>
  );
}

function LoginScreen() {
  const { signIn } = useSekar();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(await signIn(email, password));
    setBusy(false);
  };
  return (
    <Card className="mx-auto mt-8 max-w-md">
      <h1 className="text-xl font-bold text-navy-900">Masuk ke SEKAR</h1>
      <p className="mt-1 text-sm text-muted">Autentikasi Supabase. Akses data ditentukan oleh pemetaan peran di database (RLS).</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-semibold">
            Email
          </label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-lg border border-line px-3" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-semibold">
            Kata sandi
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-lg border border-line px-3"
          />
        </div>
        {err && (
          <p role="alert" className="text-sm text-rose-700">
            {err}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Masuk
        </Button>
      </form>
    </Card>
  );
}

function DocumentPreview() {
  const { previewDoc, closePreview, downloadDocument } = useSekar();
  const doc = previewDoc?.doc;
  return (
    <Drawer
      open={!!previewDoc}
      onClose={closePreview}
      title={doc?.title ?? "Dokumen"}
      subtitle={
        doc && (
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="amber">SIMULASI</Badge>
            <span>
              {doc.id} · jenis {doc.kind} · cakupan {doc.scope}
            </span>
          </span>
        )
      }
      footer={
        doc && (
          <>
            <Button onClick={closePreview}>Tutup</Button>
            <Button variant="primary" onClick={() => downloadDocument(doc.id)}>
              <Download className="h-4 w-4" aria-hidden />
              Unduh .txt simulasi
            </Button>
          </>
        )
      }
    >
      <SimulationNote>Pratinjau dokumen simulasi yang dibangun dari kolom content_text. Tidak ada berkas PDF asli.</SimulationNote>
      <div className="mt-4">
        {previewDoc?.error ? (
          <p role="alert" className="text-rose-700">
            {previewDoc.error}
          </p>
        ) : !previewDoc?.content ? (
          <p role="status" className="flex items-center gap-2 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Memuat pratinjau…
          </p>
        ) : previewDoc.content.kind === "text" ? (
          <pre className="whitespace-pre-wrap rounded-xl border border-line bg-slate-50 p-4 font-mono text-[13px] leading-relaxed text-navy-900">
            {previewDoc.content.text}
          </pre>
        ) : (
          <a href={previewDoc.content.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-700 underline">
            Buka dokumen (tautan bertanda tangan, berlaku singkat)
          </a>
        )}
      </div>
    </Drawer>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useSekar();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(92vw,380px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cx(
            "pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold shadow-lg",
            t.tone === "success" && "border-teal-200 bg-teal-50 text-teal-900",
            t.tone === "error" && "border-rose-200 bg-rose-50 text-rose-900",
            t.tone === "info" && "border-sky-200 bg-sky-50 text-sky-900",
          )}
        >
          <span className="flex-1">{t.message}</span>
          <button type="button" onClick={() => dismissToast(t.id)} className="rounded p-0.5 hover:bg-white/60" aria-label="Tutup notifikasi">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Pembatas akses per halaman (simulasi di mode dummy; di Supabase data tetap dibatasi RLS). */
export function RequireRoute({ route, children }: { route: AppRoute; children: ReactNode }) {
  const { viewer, config } = useSekar();
  if (!viewer) return null;
  if (canAccessRoute(viewer.role, route)) return <>{children}</>;
  return (
    <Card className="mx-auto mt-6 max-w-2xl">
      <h1 className="text-xl font-bold text-navy-900">Halaman tidak tersedia untuk peran {ROLE_LABEL[viewer.role]}</h1>
      <p className="mt-2 text-muted">
        {route === "/admin"
          ? "Halaman Admin hanya untuk persona admin."
          : "Modul Departemen Regional hanya untuk persona DR dan admin. Data audit DR tidak ditampilkan pada peran KPw."}
      </p>
      {config.mode === "dummy" && (
        <p className="mt-2 text-sm text-muted">Ganti persona demo di bilah simulasi bagian atas untuk melihat halaman ini. Ini hanya simulasi UX, bukan kontrol keamanan.</p>
      )}
      <Link href="/" className="mt-4 inline-flex rounded-lg bg-navy-800 px-3.5 py-2 font-semibold text-white hover:bg-navy-700">
        Kembali ke beranda
      </Link>
    </Card>
  );
}
