"use client";

/**
 * Daftar akun demo (mode dummy saja). Kredensial demo sengaja publik dan hanya
 * simulasi di browser; modul ini tidak dimuat pada build Supabase.
 */
import { Building2, ShieldCheck, UserCog } from "lucide-react";
import { DEMO_EMAIL_DOMAIN, DEMO_PASSWORDS, FEATURED_ACCOUNTS, type DemoAccountInfo } from "@/lib/demo-accounts";
import { cn } from "@/lib/utils";

const ACCOUNT_ICON = [ShieldCheck, Building2, UserCog];

export function DemoAccountList({ selectedEmail, onPick }: { selectedEmail: string; onPick: (a: DemoAccountInfo) => void }) {
  return (
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
        const active = selectedEmail === a.email;
        return (
          <li key={a.email}>
            <button
              type="button"
              onClick={() => {
                onPick(a);
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
  );
}
