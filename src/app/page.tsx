"use client";

import Image from "next/image";
import Link from "next/link";
import { AuditDocIcon, CalendarClockIcon, FolderCheckIcon, LibraryGearIcon } from "@/components/icons/Illustrations";
import { ArchipelagoDecor, BuildingIllustration, WaveLines } from "@/components/layout/Decor";
import { BorderBeam } from "@/components/magicui/BorderBeam";
import { DotPattern } from "@/components/magicui/DotPattern";
import { SpotlightCard } from "@/components/magicui/SpotlightCard";
import { ArrowCircle } from "@/components/ui/primitives";
import { useSekar } from "@/components/providers/SekarProvider";
import { formatDateLong } from "@/lib/dates";

interface MenuCard {
  href: string;
  title: string;
  desc: string;
  accent: string;
  grad: [string, string, string];
  tileBg: string;
  icon: (p: { size?: number }) => React.ReactNode;
}

const MENU: MenuCard[] = [
  {
    href: "/hasil-pemeriksaan",
    title: "Hasil Pemeriksaan KPwDN",
    desc: "Temuan dan rekomendasi hasil pemeriksaan BPK, DAI, dan KAA.",
    accent: "#6d28d9",
    grad: ["#4338ca", "#7c3aed", "#ec4899"],
    tileBg: "linear-gradient(145deg,#f5f3ff 0%,#e0e7ff 55%,#fce7f3 100%)",
    icon: AuditDocIcon,
  },
  {
    href: "/permindok",
    title: "Tracker Permindok",
    desc: "Monitoring pemenuhan dokumen permintaan pemeriksaan.",
    accent: "#10b981",
    grad: ["#0f766e", "#10b981", "#22d3ee"],
    tileBg: "linear-gradient(145deg,#ecfdf5 0%,#ccfbf1 55%,#cffafe 100%)",
    icon: FolderCheckIcon,
  },
  {
    href: "/jadwal-pemeriksaan",
    title: "Jadwal Pemeriksaan",
    desc: "Timeline dan agenda pemeriksaan KPwDN.",
    accent: "#f97316",
    grad: ["#ea580c", "#f43f5e", "#f59e0b"],
    tileBg: "linear-gradient(145deg,#fff7ed 0%,#ffedd5 55%,#ffe4e6 100%)",
    icon: CalendarClockIcon,
  },
  {
    href: "/sgo-ketentuan",
    title: "SGo dan Ketentuan",
    desc: "Materi SGo, pedoman, dan ketentuan per area pemeriksaan.",
    accent: "#a21caf",
    grad: ["#6d28d9", "#c026d3", "#fb7185"],
    tileBg: "linear-gradient(145deg,#faf5ff 0%,#f3e8ff 55%,#fce7f3 100%)",
    icon: LibraryGearIcon,
  },
];

function Illustration({ card }: { card: MenuCard }) {
  const Icon = card.icon;
  return (
    <span
      className="relative grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_-10px_rgba(20,42,110,0.45)] ring-1 ring-white transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"
      style={{ background: card.tileBg }}
      aria-hidden
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent" />
      <span className="relative">
        <Icon size={54} />
      </span>
    </span>
  );
}

export default function HomePage() {
  const { datasetAsOf } = useSekar();
  return (
    <div className="relative overflow-hidden lg:h-full">
      {/* Dekorasi latar */}
      <DotPattern className="[mask-image:radial-gradient(700px_circle_at_70%_20%,white,transparent)]" />
      <div className="pointer-events-none absolute -left-40 top-16 h-[520px] w-[520px] rounded-full border-[60px] border-white/50" aria-hidden />
      <div className="pointer-events-none absolute -right-32 top-24 h-[420px] w-[420px] rounded-full bg-[#818cf8]/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[300px] w-[500px] rounded-full bg-[#f472b6]/12 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute left-[8%] top-[8%] h-[280px] w-[280px] rounded-full bg-[#fbbf24]/14 blur-3xl" aria-hidden />
      <BuildingIllustration className="pointer-events-none absolute bottom-0 left-0 hidden w-[13%] max-w-[220px] opacity-90 lg:block" />
      <WaveLines className="pointer-events-none absolute bottom-0 right-0 h-[34%] w-[75%]" />

      <section className="relative mx-auto grid max-w-[1440px] gap-8 px-4 pb-10 pt-6 sm:px-6 lg:h-full lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-10 lg:px-10 lg:py-[3vh] xl:px-16">
        {/* Kolom kiri: sambutan + logo */}
        <div className="flex flex-col items-start lg:pl-[6%]">
          <div aria-hidden className="h-[3px] w-12 rounded bg-gold" />
          <p className="mt-3 text-[24px] font-light text-navy-900 sm:text-[28px] lg:text-[clamp(22px,3.2vh,30px)]">Selamat Datang di</p>
          <h1 className="mt-2">
            <span className="sr-only">SEKAR — Sistem Informasi Evaluasi Kepatuhan, Audit &amp; Risiko</span>
            <Image
              src="/brand/sekar-logo.webp"
              alt=""
              width={900}
              height={788}
              priority
              className="h-auto w-[300px] drop-shadow-[0_10px_24px_rgba(20,42,110,0.18)] sm:w-[380px] lg:h-[min(52vh,470px)] lg:w-auto"
            />
          </h1>
        </div>

        {/* Kolom kanan: peta + menu */}
        <div className="flex min-h-0 flex-col gap-[2.2vh]">
          <div className="hidden xl:block">
            <ArchipelagoDecor className="mx-auto h-[min(27vh,250px)] w-auto max-w-full" />
          </div>
          <nav aria-label="Menu utama SEKAR">
            <ul className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {MENU.map((card) => (
                <li key={card.href}>
                  <SpotlightCard className="h-full rounded-[16px] bg-gradient-to-br from-white via-white to-[#eef5ff] shadow-[0_10px_30px_-14px_rgba(20,42,110,0.35)]" color={`${card.accent}26`}>
                    <Link
                      href={card.href}
                      className="group relative z-10 flex h-full min-h-[120px] items-center gap-4 overflow-hidden rounded-[16px] border border-white py-4 pl-6 pr-4 transition hover:-translate-y-0.5 lg:min-h-[96px] xl:min-h-[min(17vh,150px)]"
                      style={{ "--m1": card.grad[0], "--m2": card.grad[1] } as React.CSSProperties}
                    >
                      <span aria-hidden className="absolute inset-y-0 left-0 w-[5px]" style={{ background: `linear-gradient(180deg, ${card.grad.join(", ")})` }} />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-45"
                        style={{ background: `radial-gradient(circle, ${card.grad[2]}, ${card.grad[1]} 60%, transparent 70%)` }}
                      />
                      <Illustration card={card} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[18px] font-bold leading-snug text-[#1c2568] transition-colors group-hover:text-[var(--m1)]">{card.title}</span>
                        <span className="mt-1.5 line-clamp-3 block text-[13.5px] leading-relaxed text-muted">{card.desc}</span>
                      </span>
                      <ArrowCircle />
                      <BorderBeam colorFrom={card.accent} colorTo="#ffffff" size={90} duration={10} delay={MENU.indexOf(card) * 2.5} />
                    </Link>
                  </SpotlightCard>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <p className="pointer-events-none absolute bottom-2 right-6 hidden text-[11px] text-muted xl:block">
        Data simulasi{datasetAsOf ? ` · posisi ${formatDateLong(datasetAsOf)}` : ""} · identitas berupa placeholder teks
      </p>
    </div>
  );
}
