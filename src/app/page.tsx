"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, CheckCircle2, Clock, FileText, FolderOpen, Search, Settings, Files, type LucideIcon } from "lucide-react";
import { ArchipelagoDecor, BuildingIllustration, WaveLines } from "@/components/layout/Decor";
import { BorderBeam } from "@/components/magicui/BorderBeam";
import { DotPattern } from "@/components/magicui/DotPattern";
import { SpotlightCard } from "@/components/magicui/SpotlightCard";
import { ArrowCircle } from "@/components/ui/primitives";

interface MenuCard {
  href: string;
  title: string;
  desc: string;
  accent: string;
  tileBg: string;
  main: LucideIcon;
  mainColor: string;
  badge: LucideIcon;
  badgeBg: string;
}

const MENU: MenuCard[] = [
  {
    href: "/hasil-pemeriksaan",
    title: "Hasil Pemeriksaan KPwDN",
    desc: "Hasil pemeriksaan BPK/DAI/KAA pada KPwDN termasuk temuan dan rekomendasi.",
    accent: "#2f7fe0",
    tileBg: "linear-gradient(135deg,#eaf3ff,#d6e7fd)",
    main: FileText,
    mainColor: "#3d8be8",
    badge: Search,
    badgeBg: "#1d58b5",
  },
  {
    href: "/permindok",
    title: "Tracker Permindok",
    desc: "Monitor pemenuhan dokumen permintaan pemeriksaan oleh KPwDN.",
    accent: "#1fbfa5",
    tileBg: "linear-gradient(135deg,#e3faf5,#cdf1e8)",
    main: FolderOpen,
    mainColor: "#2a8fd9",
    badge: CheckCircle2,
    badgeBg: "#16a974",
  },
  {
    href: "/jadwal-pemeriksaan",
    title: "Jadwal Pemeriksaan",
    desc: "Pantau jadwal dan agenda pemeriksaan pada KPwDN.",
    accent: "#f0b429",
    tileBg: "linear-gradient(135deg,#fff8e6,#fdecc2)",
    main: CalendarDays,
    mainColor: "#3d8be8",
    badge: Clock,
    badgeBg: "#d99a12",
  },
  {
    href: "/sgo-ketentuan",
    title: "SGo dan Ketentuan",
    desc: "Akses materi SGo, pedoman, juknis, dan SOP (simulasi) terkait pelaksanaan proses bisnis di KPwDN.",
    accent: "#6c5fd3",
    tileBg: "linear-gradient(135deg,#f1edff,#e1d9fb)",
    main: Files,
    mainColor: "#5b6fd6",
    badge: Settings,
    badgeBg: "#5a48c8",
  },
];

function Illustration({ card }: { card: MenuCard }) {
  const Main = card.main;
  const Badge = card.badge;
  return (
    <span className="relative grid h-[88px] w-[88px] shrink-0 place-items-center rounded-2xl" style={{ background: card.tileBg }} aria-hidden>
      <Main className="h-11 w-11" style={{ color: card.mainColor }} strokeWidth={1.6} />
      {card.href === "/hasil-pemeriksaan" && <BarChart3 className="absolute bottom-[26px] left-[30px] h-4 w-4 text-[#1d58b5]" strokeWidth={2.4} />}
      <span className="absolute bottom-3 right-3 grid h-7 w-7 place-items-center rounded-full text-white shadow-md" style={{ background: card.badgeBg }}>
        <Badge className="h-4 w-4" strokeWidth={2.4} />
      </span>
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden">
      {/* Dekorasi latar */}
      <DotPattern className="[mask-image:radial-gradient(700px_circle_at_70%_20%,white,transparent)]" />
      <div className="pointer-events-none absolute -left-40 top-24 h-[520px] w-[520px] rounded-full border-[60px] border-white/50" aria-hidden />
      <div className="pointer-events-none absolute -right-32 top-40 h-[420px] w-[420px] rounded-full bg-[#449efe]/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[300px] w-[500px] rounded-full bg-[#a98ce8]/12 blur-3xl" aria-hidden />
      <ArchipelagoDecor className="pointer-events-none absolute right-[-2%] -top-4 hidden w-[52%] max-w-[760px] lg:block" />
      <BuildingIllustration className="pointer-events-none absolute bottom-0 left-0 hidden w-[19%] max-w-[300px] lg:block" />
      <WaveLines className="pointer-events-none absolute bottom-0 right-0 h-[38%] w-[75%]" />

      <section className="relative mx-auto max-w-[1440px] px-4 pb-16 pt-8 sm:px-6 lg:pl-[21%] lg:pr-[6%] lg:pt-14">
        <div aria-hidden className="h-[3px] w-12 rounded bg-gold" />
        <p className="mt-5 text-[26px] font-light text-navy-900 sm:text-[30px]">Selamat Datang di</p>
        <h1 className="bg-gradient-to-r from-[#141f63] via-[#1d3a9a] to-[#1d58b5] bg-clip-text text-[64px] font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-[84px]">SEKAR</h1>
        <p className="mt-2 text-[20px] font-light text-navy-900/85 sm:text-[26px]">Sistem Informasi Evaluasi Kepatuhan, Audit &amp; Risiko</p>

        <nav aria-label="Menu utama SEKAR" className="mt-10">
          <ul className="grid gap-5 md:grid-cols-2">
            {MENU.map((card) => (
              <li key={card.href}>
                <SpotlightCard className="rounded-[16px] bg-gradient-to-br from-white via-white to-[#eef5ff] shadow-[0_10px_30px_-14px_rgba(20,42,110,0.35)]" color={`${card.accent}26`}>
                <Link
                  href={card.href}
                  className="group relative z-10 flex min-h-[148px] items-center gap-5 overflow-hidden rounded-[16px] border border-white py-5 pl-7 pr-5 transition hover:-translate-y-0.5"
                >
                  <span aria-hidden className="absolute inset-y-0 left-0 w-[5px]" style={{ background: card.accent }} />
                  <Illustration card={card} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[20px] font-bold leading-snug text-[#1c2568]">{card.title}</span>
                    <span className="mt-2 block text-[14px] leading-relaxed text-muted">{card.desc}</span>
                  </span>
                  <ArrowCircle />
                  <BorderBeam colorFrom={card.accent} colorTo="#ffffff" size={90} duration={10} delay={MENU.indexOf(card) * 2.5} />
                </Link>
                </SpotlightCard>
              </li>
            ))}
          </ul>
        </nav>

      </section>
    </div>
  );
}
