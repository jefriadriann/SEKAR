import type { Metadata } from "next";
import { PermindokView } from "@/components/pages/PermindokView";

export const metadata: Metadata = { title: "Tracker Permindok" };

export default function Page() {
  return <PermindokView />;
}
