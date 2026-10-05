import { BookOpen, Building2, CalendarRange, ClipboardCheck, FileStack, Home, ShieldCheck, type LucideIcon } from "lucide-react";
import type { AppRoute } from "@/lib/scope";

export interface NavItem {
  href: AppRoute;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda", short: "Beranda", icon: Home },
  { href: "/hasil-pemeriksaan", label: "Hasil Pemeriksaan KPwDN", short: "Hasil Pemeriksaan", icon: ClipboardCheck },
  { href: "/permindok", label: "Tracker Permindok", short: "Permindok", icon: FileStack },
  { href: "/jadwal-pemeriksaan", label: "Jadwal Pemeriksaan", short: "Jadwal", icon: CalendarRange },
  { href: "/sgo-ketentuan", label: "SGo dan Ketentuan", short: "SGo & Ketentuan", icon: BookOpen },
  { href: "/dr", label: "Dashboard Departemen Regional", short: "Dashboard DR", icon: Building2 },
  { href: "/admin", label: "Admin Dataset", short: "Admin", icon: ShieldCheck },
];

export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((n) => n.href === pathname);
}
