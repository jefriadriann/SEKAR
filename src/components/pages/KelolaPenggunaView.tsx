"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, MailPlus, Trash2, UsersRound } from "lucide-react";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { Badge, Button, Card, PageHeader, SectionHeader, SelectField, SimulationNote } from "@/components/ui/primitives";
import { formatDate } from "@/lib/dates";
import { ROLE_LABEL } from "@/lib/format";
import { unitLabel } from "@/lib/regions";
import { DR_UNIT_ID, type PendingInvite, type Role } from "@/lib/types";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Undangan pengguna (mode Supabase). Admin/DR menetapkan peran & unit; pengguna tidak dapat
 * memilih unitnya sendiri. Saat akun dibuat lewat "Invite user" Supabase, database memetakan
 * peran/unit otomatis (migration 0005). Otorisasi sebenarnya di RLS: DR hanya boleh mengundang KPw.
 */
export function KelolaPenggunaView() {
  const { userAdmin, viewer, data, notify } = useReadySekar();
  const [invites, setInvites] = useState<PendingInvite[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("kpw");
  const kpwUnits = data.units.filter((u) => u.id !== DR_UNIT_ID);
  const [unit, setUnit] = useState(kpwUnits[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const roles: Role[] = viewer.role === "admin" ? ["kpw", "dr", "admin"] : ["kpw"];
  const unitName = (id: string) => {
    const u = data.units.find((x) => x.id === id);
    return u ? unitLabel(u) : id;
  };

  const refresh = useCallback(async () => {
    if (!userAdmin) return;
    try {
      setInvites(await userAdmin.list());
      setLoadErr(null);
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, [userAdmin]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- memuat daftar undangan saat halaman dibuka
    refresh();
  }, [refresh]);

  if (!userAdmin)
    return (
      <div>
        <PageHeader icon={<UsersRound className="h-8 w-8 text-[#13235a]" />} title="Kelola Pengguna" description="Undangan akun pengguna." />
        <Card>
          <p className="text-[15px] text-navy-900">Pengelolaan akun hanya tersedia pada mode Supabase. Mode demo memakai akun simulasi di browser.</p>
        </Card>
      </div>
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) return setErr("Format email tidak valid.");
    setBusy(true);
    const res = await userAdmin.create({ email: clean, role, unit_id: role === "kpw" ? unit : DR_UNIT_ID, display_name: name });
    setBusy(false);
    setErr(res);
    if (!res) {
      notify(`Undangan untuk ${clean} tersimpan. Lanjutkan dengan "Invite user" di Supabase.`, "success");
      setEmail("");
      setName("");
      refresh();
    }
  };

  const status = (i: PendingInvite) =>
    i.claimed_at ? <Badge tone="teal">Akun aktif</Badge> : new Date(i.expires_at) < new Date() ? <Badge tone="rose">Kedaluwarsa</Badge> : <Badge tone="amber">Menunggu akun</Badge>;

  return (
    <div>
      <PageHeader icon={<UsersRound className="h-8 w-8 text-[#13235a]" />} title="Kelola Pengguna" description="Undang pegawai KPw/DR; peran dan unit ditetapkan di sini, bukan oleh pengguna." />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Card aria-labelledby="undang">
          <SectionHeader id="undang" icon={<MailPlus />} title="Undang pengguna" />
          <form onSubmit={submit} className="space-y-3" aria-label="Form undangan pengguna">
            <div>
              <label htmlFor="inv-email" className="mb-1 block text-[14px] font-semibold text-navy-900">
                Email
              </label>
              <input id="inv-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-lg border border-line px-3" />
            </div>
            <div>
              <label htmlFor="inv-name" className="mb-1 block text-[14px] font-semibold text-navy-900">
                Nama tampilan
              </label>
              <input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-lg border border-line px-3" />
            </div>
            <SelectField id="inv-role" label="Peran" value={role} onChange={(v) => setRole(v as Role)} options={roles.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
            {role === "kpw" ? (
              <SelectField id="inv-unit" label="Kantor (KPw)" value={unit} onChange={setUnit} options={kpwUnits.map((u) => ({ value: u.id, label: unitLabel(u) }))} />
            ) : (
              <p className="text-[13px] text-muted">Peran {ROLE_LABEL[role]} selalu memakai unit Departemen Regional.</p>
            )}
            {err && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[14px] text-rose-800">
                {err}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={busy || !email}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Simpan undangan
            </Button>
          </form>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-[13.5px] text-navy-900">
            <li>Simpan undangan di sini (email + kantor).</li>
            <li>
              Supabase Dashboard → <b>Authentication → Users → Invite user</b>, masukkan email yang sama.
            </li>
            <li>Pengguna membuka email, mendaftarkan authenticator di HP-nya, lalu membuat kata sandi sendiri.</li>
            <li>Peran & kantor terpasang otomatis; pengguna hanya melihat data kantornya.</li>
          </ol>
          <div className="mt-3">
            <SimulationNote>Undangan berlaku 14 hari. DR hanya dapat mengundang peran KPw; peran DR/Admin hanya oleh Admin.</SimulationNote>
          </div>
        </Card>
        <Card aria-labelledby="daftar-undangan">
          <SectionHeader id="daftar-undangan" icon={<UsersRound />} iconTone="blue" title={`Undangan (${invites?.length ?? 0})`} />
          {loadErr && (
            <p role="alert" className="text-rose-800">
              {loadErr}
            </p>
          )}
          {!invites ? (
            <p className="flex items-center gap-2 text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Memuat…
            </p>
          ) : invites.length === 0 ? (
            <p className="text-muted">Belum ada undangan.</p>
          ) : (
            <ul className="space-y-2">
              {invites.map((i) => (
                <li key={i.email} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block font-semibold text-navy-900">{i.display_name || i.email}</span>
                    <span className="block text-[12.5px] text-muted">
                      {i.email} · {ROLE_LABEL[i.role]} · {unitName(i.unit_id)} · berlaku s.d. {formatDate(i.expires_at.slice(0, 10))}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {status(i)}
                    {!i.claimed_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Hapus undangan ${i.email}`}
                        onClick={async () => {
                          const r = await userAdmin.remove(i.email);
                          notify(r ?? "Undangan dihapus.", r ? "error" : "success");
                          refresh();
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
