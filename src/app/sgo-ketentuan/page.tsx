import type { Metadata } from "next";
import { SgoView } from "@/components/pages/SgoView";

export const metadata: Metadata = { title: "SGo dan Ketentuan" };

export default function Page() {
  return <SgoView />;
}
