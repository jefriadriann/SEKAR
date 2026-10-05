import type { Metadata } from "next";
import { HasilPemeriksaanView } from "@/components/pages/HasilPemeriksaanView";

export const metadata: Metadata = { title: "Hasil Pemeriksaan KPwDN" };

export default function Page() {
  return <HasilPemeriksaanView />;
}
