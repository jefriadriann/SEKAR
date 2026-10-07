"use client";

import Image from "next/image";
import Link from "next/link";
import { AuditDocIcon, CalendarClockIcon, FolderCheckIcon, LibraryGearIcon } from "@/components/icons/Illustrations";
import { ArchipelagoDecor, BuildingIllustration, WaveLines } from "@/components/layout/Decor";
import { DotPattern } from "@/components/magicui/DotPattern";
import { ArrowCircle } from "@/components/ui/primitives";
import { useSekar } from "@/components/providers/SekarProvider";
import { formatDateLong } from "@/lib/dates";

interface MenuCard {
  href: string;
  title: string;
  desc: string;
  tileBg: string;
  icon: (p: { size?: number }) => React.ReactNode;
}

const MENU: MenuCard[] = [
  {
    href: "/hasil-pemeriksaan",
    title: "Hasil Pemeriksaan KPwDN",
    desc: "Temuan dan rekomendasi hasil pemeriksaan BPK, DAI, dan KAA.",
    tileBg: "#eef2f9",
    icon: AuditDocIcon,
  },
  {
    href: "/permindok",
    title: "Tracker Permindok",
    desc: "Monitoring pemenuhan dokumen permintaan pemeriksaan.",
    tileBg: "#eef2f9",
    icon: FolderCheckIcon,
  },
  {
    href: "/jadwal-pemeriksaan",
    title: "Jadwal Pemeriksaan",
    desc: "Timeline dan agenda pemeriksaan KPwDN.",
    tileBg: "#eef2f9",
    icon: CalendarClockIcon,
  },
  {
    href: "/sgo-ketentuan",
    title: "SGo dan Ketentuan",
    desc: "Materi SGo, pedoman, dan ketentuan per area pemeriksaan.",
    tileBg: "#eef2f9",
    icon: LibraryGearIcon,
  },
];

function Illustration({ card }: { card: MenuCard }) {
  const Icon = card.icon;
  return (
    <span
      className="relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-2xl"
      style={{ background: card.tileBg }}
      aria-hidden
    >
      <span className="relative">
        <Icon size={50} />
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
                  <div className="h-full rounded-[14px] border border-[#e0e6ef] bg-white shadow-[0_1px_2px_rgba(19,35,90,0.04),0_8px_22px_-14px_rgba(19,35,90,0.25)] transition-shadow hover:shadow-[0_1px_2px_rgba(19,35,90,0.06),0_14px_28px_-14px_rgba(19,35,90,0.35)]">
                    <Link
                      href={card.href}
                      className="group relative z-10 flex h-full min-h-[120px] items-center gap-4 overflow-hidden rounded-[14px] py-4 pl-6 pr-4 transition hover:-translate-y-0.5 lg:min-h-[96px] xl:min-h-[min(17vh,150px)]"
                    >
                      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[#1d4f9e]" />
                      <Illustration card={card} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[18px] font-bold leading-snug text-[#1c2568] transition-colors group-hover:text-[var(--m1)]">{card.title}</span>
                        <span className="mt-1.5 line-clamp-3 block text-[13.5px] leading-relaxed text-muted">{card.desc}</span>
                      </span>
                      <ArrowCircle />
                    </Link>
                  </div>
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
