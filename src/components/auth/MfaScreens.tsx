"use client";

/**
 * Layar MFA (mode Supabase). Seluruh langkah memakai Supabase Auth MFA (TOTP).
 * Komponen hanya UI: penegakan akses ada di RLS (aal2) dan API server.
 * QR & kunci manual hanya disimpan di state komponen dan dibuang setelah
 * verifikasi; tidak pernah ditulis ke log atau storage.
 */
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { KeyRound, Loader2, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { useSekar } from "@/components/providers/SekarProvider";
import { Button } from "@/components/ui/primitives";
import { isTotpCode, type TotpEnrollment } from "@/lib/auth/mfa";

/** Batas percobaan di sisi klien (UX). Batas sebenarnya: rate limit Supabase Auth. */
const MAX_TRIES = 5;
const LOCK_SECONDS = 30;

function useThrottle() {
  const failsRef = useRef(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!remaining) return;
    const t = setTimeout(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining]);
  return {
    locked: remaining > 0,
    remaining,
    fail: () => {
      failsRef.current += 1;
      if (failsRef.current >= MAX_TRIES) {
        failsRef.current = 0;
        setRemaining(LOCK_SECONDS);
      }
    },
  };
}

export function CodeInput({ id, value, onChange, label = "Kode 6 digit dari aplikasi authenticator" }: { id: string; value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-semibold text-navy-900">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="h-12 w-full rounded-xl border border-[#d6dfee] bg-white px-4 text-center font-mono text-[22px] tracking-[0.4em] text-navy-950 outline-none focus:border-[#1d4f9e] focus:ring-4 focus:ring-[#1d4f9e]/10"
      />
    </div>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[14px] text-rose-800">
      {children}
    </p>
  );
}

/** Pendaftaran authenticator (TOTP): QR → kode → sesi aal2. */
export function MfaEnrollPanel({ onDone, startLabel = "Mulai pendaftaran authenticator" }: { onDone?: () => void; startLabel?: string }) {
  const { mfa } = useSekar();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const throttle = useThrottle();
  if (!mfa) return null;

  const start = async () => {
    setBusy(true);
    setErr(null);
    try {
      setEnrollment(await mfa.beginEnrollment());
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrollment || throttle.locked) return;
    setBusy(true);
    const res = await mfa.verify(enrollment.factorId, code);
    setBusy(false);
    if (res) {
      throttle.fail();
      setErr(res);
      setCode("");
      return;
    }
    setEnrollment(null);
    setCode("");
    onDone?.();
  };

  if (!enrollment)
    return (
      <div className="space-y-3">
        {err && <ErrorText>{err}</ErrorText>}
        <Button variant="primary" onClick={start} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Smartphone className="h-4 w-4" aria-hidden />}
          {startLabel}
        </Button>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Verifikasi authenticator baru">
      <ol className="list-decimal space-y-1 pl-5 text-[14px] text-navy-900">
        <li>Buka aplikasi authenticator (mis. Google Authenticator, Microsoft Authenticator, 1Password).</li>
        <li>Pindai kode QR berikut.</li>
        <li>Masukkan kode 6 digit yang muncul.</li>
      </ol>
      <div className="flex justify-center rounded-xl border border-line bg-white p-3">
        {/* QR berupa SVG data URL dari Supabase Auth. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrollment.qrCode} alt="Kode QR untuk aplikasi authenticator" width={200} height={200} className="h-[200px] w-[200px]" />
      </div>
      <div>
        <button type="button" className="text-[13px] font-semibold text-sky-700 underline" onClick={() => setShowSecret((v) => !v)} aria-expanded={showSecret}>
          {showSecret ? "Sembunyikan kunci manual" : "Tidak bisa memindai? Tampilkan kunci manual"}
        </button>
        {showSecret && (
          <p className="mt-2 break-all rounded-lg bg-[#f4f6fb] px-3 py-2 font-mono text-[13px] text-navy-900" data-sensitive>
            {enrollment.secret}
          </p>
        )}
      </div>
      <CodeInput id="mfa-enroll-code" value={code} onChange={setCode} />
      {err && <ErrorText>{err}</ErrorText>}
      {throttle.locked && <ErrorText>Terlalu banyak percobaan. Coba lagi dalam {throttle.remaining} detik.</ErrorText>}
      <Button type="submit" variant="primary" disabled={busy || !isTotpCode(code) || throttle.locked}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Verifikasi dan aktifkan
      </Button>
    </form>
  );
}

/** Challenge saat login: pilih authenticator, masukkan kode. */
export function MfaChallengePanel() {
  const { mfa } = useSekar();
  const factors = mfa?.factors ?? [];
  const [factorId, setFactorId] = useState(factors[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const throttle = useThrottle();
  if (!mfa) return null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (throttle.locked) return;
    setBusy(true);
    const res = await mfa.verify(factorId || factors[0]?.id, code);
    setBusy(false);
    if (res) {
      throttle.fail();
      setErr(res);
      setCode("");
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Verifikasi MFA">
      {factors.length > 1 && (
        <fieldset>
          <legend className="mb-1.5 text-[14px] font-semibold text-navy-900">Authenticator</legend>
          <div className="space-y-1.5">
            {factors.map((f) => (
              <label key={f.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[14px]">
                <input type="radio" name="factor" value={f.id} checked={(factorId || factors[0]?.id) === f.id} onChange={() => setFactorId(f.id)} />
                {f.friendly_name || "Authenticator"}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <CodeInput id="mfa-challenge-code" value={code} onChange={setCode} />
      {err && <ErrorText>{err}</ErrorText>}
      {throttle.locked && <ErrorText>Terlalu banyak percobaan. Coba lagi dalam {throttle.remaining} detik.</ErrorText>}
      <Button type="submit" variant="primary" className="w-full" disabled={busy || !isTotpCode(code) || throttle.locked}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Verifikasi
      </Button>
      <p className="text-[13px] text-muted">
        Kehilangan perangkat? Gunakan authenticator cadangan bila sudah didaftarkan, atau hubungi admin SEKAR. Admin akan memverifikasi identitas Anda di luar
        aplikasi sebelum mereset faktor MFA.
      </p>
    </form>
  );
}

export const MIN_PASSWORD = 12;

/** Kata sandi baru setelah tautan reset — hanya tampil setelah sesi aal2. */
export function NewPasswordPanel() {
  const { mfa } = useSekar();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!mfa) return null;
  const problem = pw.length < MIN_PASSWORD ? `Minimal ${MIN_PASSWORD} karakter.` : pw !== pw2 ? "Konfirmasi tidak sama." : null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (problem) return;
    setBusy(true);
    setErr(await mfa.updatePassword(pw));
    setBusy(false);
  };
  const cls = "h-12 w-full rounded-xl border border-[#d6dfee] bg-white px-4 text-[15px] outline-none focus:border-[#1d4f9e] focus:ring-4 focus:ring-[#1d4f9e]/10";
  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Formulir kata sandi baru">
      <div>
        <label htmlFor="new-pw" className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Kata sandi baru
        </label>
        <input id="new-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={cls} />
      </div>
      <div>
        <label htmlFor="new-pw2" className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Ulangi kata sandi baru
        </label>
        <input id="new-pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={cls} />
      </div>
      {pw && problem && <p className="text-[13px] text-muted">{problem}</p>}
      {err && <ErrorText>{err}</ErrorText>}
      <Button type="submit" variant="primary" className="w-full" disabled={busy || !!problem}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Simpan kata sandi
      </Button>
    </form>
  );
}

/** Layar penuh saat sesi belum memenuhi syarat (aal1) atau sedang reset kata sandi. */
export function MfaGateScreen() {
  const { status, signOut } = useSekar();
  const view =
    status === "needs_mfa_enroll"
      ? {
          icon: <ShieldCheck className="h-6 w-6" aria-hidden />,
          title: "Aktifkan verifikasi dua langkah",
          desc: "Akun SEKAR wajib memakai aplikasi authenticator. Data baru dapat dibuka setelah pendaftaran selesai.",
          body: <MfaEnrollPanel />,
        }
      : status === "needs_mfa_challenge"
        ? {
            icon: <KeyRound className="h-6 w-6" aria-hidden />,
            title: "Verifikasi dua langkah",
            desc: "Masukkan kode dari aplikasi authenticator Anda.",
            body: <MfaChallengePanel />,
          }
        : {
            icon: <KeyRound className="h-6 w-6" aria-hidden />,
            title: "Tetapkan kata sandi baru",
            desc: "Identitas Anda sudah diverifikasi dengan MFA. Setelah disimpan, Anda akan diminta masuk kembali.",
            body: <NewPasswordPanel />,
          };
  return (
    <main className="grid min-h-dvh place-items-center bg-[#eef2f8] px-4 py-10">
      <div className="w-full max-w-[460px] rounded-2xl border border-line bg-white p-6 shadow-xl sm:p-8">
        <Image src="/brand/sekar-emblem.webp" alt="SEKAR" width={567} height={360} className="h-9 w-auto" priority />
        <div className="mt-5 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#13235a] text-white">{view.icon}</span>
          <div>
            <h1 className="text-[22px] font-extrabold leading-tight text-navy-950">{view.title}</h1>
            <p className="mt-1 text-[14px] text-muted">{view.desc}</p>
          </div>
        </div>
        <div className="mt-6">{view.body}</div>
        <Button variant="ghost" className="mt-5 w-full" onClick={signOut}>
          <LogOut className="h-4 w-4" aria-hidden />
          Keluar
        </Button>
      </div>
    </main>
  );
}
