import type { Metadata } from "next";
import { JadwalView } from "@/components/pages/JadwalView";

export const metadata: Metadata = { title: "Jadwal Pemeriksaan" };

export default function Page() {
  return <JadwalView />;
}
