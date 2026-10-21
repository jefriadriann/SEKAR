"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, MonitorSmartphone, ShieldCheck, Trash2 } from "lucide-react";
import { CodeInput, MfaEnrollPanel } from "@/components/auth/MfaScreens";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { Badge, Button, Card, PageHeader, SectionHeader, SelectField, SimulationNote } from "@/components/ui/primitives";
import { isTotpCode, type TotpFactor } from "@/lib/auth/mfa";
import { formatDate } from "@/lib/dates";

/** Halaman keamanan akun: kelola authenticator (MFA) dan sesi. */
export function KeamananView() {
  const { config, mfa, notify } = useReadySekar();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<TotpFactor | null>(null);

  useEffect(() => {
    mfa?.refreshFactors().catch(() => undefined);
    // hanya saat halaman dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader icon={<ShieldCheck className="h-8 w-8 text-[#13235a]" />} title="Keamanan Akun" description="Verifikasi dua langkah (MFA) dan sesi login." />
      {config.mode === "dummy" || !mfa ? (
        <Card>
          <SectionHeader icon={<ShieldCheck />} title="Mode demo" />
          <p className="text-[15px] text-navy-900">
            MFA berlaku pada mode Supabase (<code>APP_DATA_MODE=supabase</code>). Mode demo memakai akun simulasi di browser dan data dummy yang dapat dibaca
            publik — bukan kontrol keamanan.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card aria-labelledby="faktor-mfa">
            <SectionHeader id="faktor-mfa" icon={<ShieldCheck />} title="Authenticator terdaftar" description="Simpan minimal dua authenticator agar tidak terkunci bila perangkat hilang." />
            <ul className="space-y-2">
              {mfa.factors.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                  <span>
                    <span className="block font-semibold text-navy-900">{f.friendly_name || "Authenticator"}</span>
                    {f.created_at && <span className="text-[12.5px] text-muted">Didaftarkan {formatDate(f.created_at.slice(0, 10))}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone="teal">Aktif</Badge>
                    <Button size="sm" variant="ghost" disabled={mfa.factors.length <= 1} onClick={() => setRemoving(f)} aria-label={`Hapus ${f.friendly_name || "authenticator"}`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Hapus
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
            {mfa.factors.length <= 1 && (
              <p className="mt-2 text-[13px] text-muted">Faktor terakhir tidak dapat dihapus. Untuk mengganti perangkat, tambahkan authenticator baru lalu hapus yang lama.</p>
            )}
            {removing && <RemoveFactorForm target={removing} factors={mfa.factors} onClose={() => setRemoving(null)} />}
            <div className="mt-4 border-t border-line pt-4">
              {adding ? (
                <MfaEnrollPanel
                  startLabel="Buat kode QR authenticator baru"
                  onDone={() => {
                    setAdding(false);
                    mfa.refreshFactors().catch(() => undefined);
                    notify("Authenticator baru aktif.", "success");
                  }}
                />
              ) : (
                <Button onClick={() => setAdding(true)}>Tambah authenticator cadangan / pengganti</Button>
              )}
            </div>
          </Card>
          <Card aria-labelledby="sesi">
            <SectionHeader id="sesi" icon={<MonitorSmartphone />} iconTone="blue" title="Sesi" />
            <p className="text-[14px] text-navy-900">Keluarkan akun ini dari perangkat lain (sesi di perangkat ini tetap aktif).</p>
            <Button
              className="mt-3"
              onClick={async () => {
                const err = await mfa.signOutOthers();
                notify(err ?? "Sesi di perangkat lain telah dikeluarkan.", err ? "error" : "success");
              }}
            >
              Keluarkan sesi lain
            </Button>
            <div className="mt-4">
              <SimulationNote>
                Kehilangan semua authenticator: hubungi admin SEKAR. Reset faktor dilakukan pengelola proyek Supabase setelah verifikasi identitas di luar
                aplikasi (lihat SECURITY.md). Reset kata sandi tetap mewajibkan MFA.
              </SimulationNote>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function RemoveFactorForm({ target, factors, onClose }: { target: TotpFactor; factors: TotpFactor[]; onClose: () => void }) {
  const { mfa, notify } = useReadySekar();
  const others = factors.filter((f) => f.id !== target.id);
  const [stepUp, setStepUp] = useState(others[0]?.id ?? target.id);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfa) return;
    setBusy(true);
    const res = await mfa.removeFactor({ factorId: target.id, stepUpFactorId: stepUp, code });
    setBusy(false);
    if (res) return setErr(res);
    notify("Authenticator dihapus.", "success");
    onClose();
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4" aria-label="Konfirmasi hapus authenticator">
      <p className="text-[14px] font-semibold text-navy-900">Hapus “{target.friendly_name || "Authenticator"}” — konfirmasi dengan kode authenticator</p>
      <SelectField
        id="stepup-factor"
        label="Ambil kode dari"
        value={stepUp}
        onChange={setStepUp}
        options={factors.map((f) => ({ value: f.id, label: f.friendly_name || "Authenticator" }))}
      />
      <CodeInput id="stepup-code" value={code} onChange={setCode} label="Kode 6 digit" />
      {err && (
        <p role="alert" className="text-[14px] text-rose-800">
          {err}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={busy || !isTotpCode(code)}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Hapus authenticator
        </Button>
        <Button onClick={onClose}>Batal</Button>
      </div>
    </form>
  );
}
