"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, Eye, EyeOff, FlaskConical, Loader2, Lock, Mail, ShieldCheck, UserCog } from "lucide-react";
import { IndonesiaMap } from "@/components/map/IndonesiaMap";
import { useSekar } from "@/components/providers/SekarProvider";
import { DEMO_EMAIL_DOMAIN, DEMO_PASSWORDS, FEATURED_ACCOUNTS } from "@/lib/demo-accounts";
import { cn } from "@/lib/utils";

const ACCOUNT_ICON = [ShieldCheck, Building2, UserCog];

/**
 * Halaman masuk. Mode dummy: akun demo (simulasi di browser, bukan keamanan).
 * Mode Supabase: Supabase Auth; akses data ditentukan RLS.
 */
export function LoginPage() {
  const { signIn, config } = useSekar();
  const router = useRouter();
  const pathname = usePathname();
  const demo = config.mode === "dummy";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await signIn(email, password);
    setErr(res);
    // Setelah masuk selalu mulai dari beranda (landing page), apa pun URL sebelumnya.
    if (!res && pathname !== "/") router.replace("/");
    setBusy(false);
  };

  return (
    <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] overflow-x-hidden bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panel identitas */}
      <aside className="relative hidden overflow-hidden bg-[#eef2f8] lg:flex lg:flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[6%] px-10 opacity-60">
          <IndonesiaMap variant="decor" className="h-auto w-full" />
        </div>
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full border-[40px] border-white/70" />
        <div className="relative flex items-center gap-3 px-12 pt-10" title="Placeholder identitas berbasis teks, bukan logo resmi">
          <div className="leading-none">
            <p className="whitespace-nowrap font-serif text-[18px] font-bold tracking-wide text-navy-950">BANK INDONESIA</p>
            <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-navy-900">Bank Sentral Republik Indonesia</p>
          </div>
          <span aria-hidden className="h-8 w-px bg-navy-900/50" />
          <p className="text-[11px] font-bold uppercase leading-tight text-navy-900">
            Departemen
            <br />
            Regional
          </p>
        </div>
        <div className="relative flex flex-1 flex-col items-center justify-center px-12 pb-40">
          <Image src="/brand/sekar-logo.webp" alt="" width={900} height={788} priority className="h-auto w-[min(420px,70%)] drop-shadow-[0_10px_24px_rgba(19,35,90,0.12)]" />
          <p className="mt-6 max-w-sm text-center text-[15px] leading-relaxed text-navy-800">
            Satu ruang kerja untuk hasil pemeriksaan, permintaan dokumen, jadwal, dan ketentuan pemeriksaan KPwDN.
          </p>
        </div>
      </aside>

      {/* Form masuk */}
      <main className="flex min-w-0 flex-col px-5 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between gap-3">
          <Image src="/brand/sekar-emblem.webp" alt="SEKAR" width={567} height={360} priority className="h-10 w-auto lg:invisible" />
          {demo && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11.5px] font-bold text-amber-900">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              Mode Demo — Data Simulasi
            </span>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#a8832a]">SEKAR</p>
          <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-navy-950">Masuk ke akun Anda</h1>
          <p className="mt-2 text-[15px] text-muted">
            {demo ? "Gunakan akun DR untuk melihat seluruh KPwDN, atau akun KPw untuk tampilan satu kantor." : "Masuk dengan akun yang telah didaftarkan admin SEKAR."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Field id="email" label="Email" icon={<Mail />}>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                placeholder={demo ? `nama@${DEMO_EMAIL_DOMAIN}` : "nama@instansi"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#d6dfee] bg-white pl-11 pr-3 text-[15px] text-navy-950 outline-none transition-colors placeholder:text-slate-400 hover:border-[#b9c8e0] focus:border-[#1d4f9e] focus:ring-4 focus:ring-[#1d4f9e]/10"
              />
            </Field>
            <Field id="password" label="Kata sandi" icon={<Lock />}>
              <input
                id="password"
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#d6dfee] bg-white pl-11 pr-12 text-[15px] text-navy-950 outline-none transition-colors placeholder:text-slate-400 hover:border-[#b9c8e0] focus:border-[#1d4f9e] focus:ring-4 focus:ring-[#1d4f9e]/10"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy-900"
                aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </Field>

            {err && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[14px] text-rose-800">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !email || !password}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#13235a] text-[15px] font-bold text-white transition-colors hover:bg-[#1d4f9e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Masuk
              {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />}
            </button>
          </form>

          {demo && (
            <section aria-labelledby="akun-demo" className="mt-8">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-[#e0e6ef]" />
                <h2 id="akun-demo" className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Akun demo
                </h2>
                <span className="h-px flex-1 bg-[#e0e6ef]" />
              </div>
              <ul className="mt-4 space-y-2">
                {FEATURED_ACCOUNTS.map((a, i) => {
                  const Icon = ACCOUNT_ICON[i];
                  const active = email === a.email;
                  return (
                    <li key={a.email}>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(a.email);
                          setPassword(a.password);
                          setErr(null);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                          active ? "border-[#1d4f9e] bg-[#f3f6fc]" : "border-[#e0e6ef] hover:border-[#b9c8e0] hover:bg-[#f8fafd]",
                        )}
                        aria-label={`Isi akun demo ${a.label}`}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#13235a] text-white" aria-hidden>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-bold text-navy-950">{a.label}</span>
                          <span className="block truncate text-[12.5px] text-muted">
                            {a.email} · {a.description}
                          </span>
                        </span>
                        <span className="text-[12px] font-semibold text-[#1d4f9e]">Isi</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                Akun KPw lain: <code className="rounded bg-slate-100 px-1">kpw01</code> s.d. <code className="rounded bg-slate-100 px-1">kpw46@{DEMO_EMAIL_DOMAIN}</code>, kata
                sandi <code className="rounded bg-slate-100 px-1">{DEMO_PASSWORDS.kpw}</code>. Login demo hanya simulasi di browser, bukan kontrol keamanan.
              </p>
            </section>
          )}
        </div>

        <p className="text-center text-[12px] text-muted">© SEKAR · Departemen Regional · Data simulasi</p>
      </main>
    </div>
  );
}

function Field({ id, label, icon, children }: { id: string; label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-navy-900">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 [&_svg]:h-[18px] [&_svg]:w-[18px]" aria-hidden>
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}
