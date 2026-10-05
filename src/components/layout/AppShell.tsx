"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, CalendarClock, ChevronRight, Download, FlaskConical, Loader2, LogOut, Menu, RotateCcw, UserRound, X } from "lucide-react";
import { useSekar } from "@/components/providers/SekarProvider";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, Button, Card, cx, SimulationNote, Skeleton } from "@/components/ui/primitives";
import { formatDate, formatDateLong } from "@/lib/dates";
import { ROLE_LABEL } from "@/lib/format";
import { canAccessRoute, type AppRoute } from "@/lib/scope";
import { NAV_ITEMS, navItemFor } from "./nav";

export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useSekar();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:font-semibold">
        Lewati ke konten
      </a>
      <Header />
      <main id="konten" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        {status === "ready" ? (
          <>
            <Breadcrumb />
            {children}
          </>
        ) : (
          <StatusScreen />
        )}
      </main>
      <Footer />
      <DocumentPreview />
      <Toasts />
    </div>
  );
}

function IdentityPlaceholder() {
  return (
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-100 sm:text-xs">
      <span className="rounded border border-sky-200/50 px-1.5 py-0.5" title="Placeholder identitas berbasis teks, bukan logo resmi">
        BANK INDONESIA
      </span>
      <span aria-hidden className="text-sky-300">
        |
      </span>
      <span>DEPARTEMEN REGIONAL</span>
    </div>
  );
}

function Header() {
  const pathname = usePathname();
  const { viewer, status, config } = useSekar();
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS.filter((n) => !viewer || canAccessRoute(viewer.role, n.href));

  return (
    <header className="z-40 shadow-sm lg:sticky lg:top-0">
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-sky-800">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-1.5 sm:px-6 lg:px-8">
          <IdentityPlaceholder />
          {config.mode === "dummy" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold text-navy-950">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              Mode Demo — Data Simulasi
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-300 px-2.5 py-0.5 text-xs font-bold text-navy-950">Mode Supabase</span>
          )}
        </div>
      </div>
      <div className="border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="SEKAR — kembali ke beranda">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 text-lg font-black text-white" aria-hidden>
              S
            </span>
            <span className="leading-tight">
              <span className="block text-xl font-black tracking-wide text-navy-900">SEKAR</span>
              <span className="hidden text-[11px] font-semibold text-muted sm:block">Sistem Informasi Evaluasi Kepatuhan, Audit &amp; Risiko</span>
            </span>
          </Link>
          <nav aria-label="Navigasi utama" className="ml-auto hidden xl:block">
            <ul className="flex items-center gap-0.5">
              {items.map((n) => {
                const active = pathname === n.href;
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[15px] font-semibold transition-colors",
                        active ? "bg-sky-100 text-navy-900" : "text-navy-700 hover:bg-sky-50",
                      )}
                    >
                      <n.icon className="h-4 w-4" aria-hidden />
                      {n.short}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <button
            type="button"
            className="ml-auto rounded-lg border border-line p-2 text-navy-800 hover:bg-sky-50 xl:hidden"
            aria-expanded={open}
            aria-controls="nav-mobile"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            <span className="sr-only">{open ? "Tutup menu" : "Buka menu"}</span>
          </button>
        </div>
        {open && (
          <nav id="nav-mobile" aria-label="Navigasi utama (seluler)" className="border-t border-line xl:hidden">
            <ul className="mx-auto grid max-w-[1400px] gap-1 px-4 py-2 sm:grid-cols-2 sm:px-6">
              {items.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === n.href ? "page" : undefined}
                    className={cx(
                      "flex items-center gap-2 rounded-lg px-3 py-2.5 font-semibold",
                      pathname === n.href ? "bg-sky-100 text-navy-900" : "text-navy-700 hover:bg-sky-50",
                    )}
                  >
                    <n.icon className="h-4 w-4" aria-hidden />
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {status === "ready" && <SimulationBar />}
      </div>
    </header>
  );
}

function SimulationBar() {
  const { viewer, personas, setPersona, asOf, datasetAsOf, setAsOf, resetAsOf, config, signOut } = useSekar();
  if (!viewer) return null;
  return (
    <div className="border-t border-line bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 text-sm sm:px-6 lg:px-8">
        {config.mode === "dummy" ? (
          <div className="flex flex-wrap items-center gap-2">
            <UserRound className="h-4 w-4 text-navy-700" aria-hidden />
            <label htmlFor="persona" className="font-semibold text-navy-800">
              Persona demo
            </label>
            <select
              id="persona"
              value={viewer.id}
              onChange={(e) => setPersona(e.target.value)}
              className="h-8 rounded-md border border-line bg-white px-2 font-semibold text-navy-900"
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {ROLE_LABEL[p.role]} — {p.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">Simulasi tampilan per peran, bukan login/keamanan.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-navy-700" aria-hidden />
            <span className="font-semibold text-navy-800">{viewer.name}</span>
            <Badge tone="blue">{ROLE_LABEL[viewer.role]}</Badge>
            <Button size="sm" variant="ghost" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" aria-hidden />
              Keluar
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <CalendarClock className="h-4 w-4 text-navy-700" aria-hidden />
          <label htmlFor="as-of" className="font-semibold text-navy-800">
            Tanggal acuan
          </label>
          <input
            id="as-of"
            type="date"
            value={asOf}
            onChange={(e) => e.target.value && setAsOf(e.target.value)}
            className="h-8 rounded-md border border-line bg-white px-2 text-navy-900"
          />
          {datasetAsOf && asOf !== datasetAsOf ? (
            <Button size="sm" variant="ghost" onClick={resetAsOf}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Kembali ke {formatDate(datasetAsOf)}
            </Button>
          ) : (
            <span className="text-xs text-muted">sesuai metadata dataset</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Breadcrumb() {
  const pathname = usePathname();
  const current = navItemFor(pathname);
  if (pathname === "/") return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-muted">
        <li>
          <Link href="/" className="font-semibold text-navy-700 hover:underline">
            Beranda
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="h-3.5 w-3.5" />
        </li>
        <li aria-current="page" className="font-semibold text-navy-900">
          {current?.label ?? "Halaman tidak ditemukan"}
        </li>
      </ol>
    </nav>
  );
}

function Footer() {
  const { datasetAsOf, fullDataset } = useSekar();
  return (
    <footer className="border-t border-line bg-white/80">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted sm:px-6 lg:px-8">
        <p>
          SEKAR — prototipe demonstrasi. Seluruh unit (46 KPw fiktif + DR), angka, dan dokumen adalah data simulasi
          {fullDataset ? ` (${fullDataset.metadata.name} v${fullDataset.metadata.version}` : ""}
          {datasetAsOf ? `, tanggal dataset ${formatDateLong(datasetAsOf)})` : fullDataset ? ")" : ""}. Bukan penilaian kantor mana pun.
        </p>
        <p>Identitas di header adalah placeholder teks, bukan logo resmi.</p>
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
