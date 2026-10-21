import type { Metadata } from "next";
import { KeamananView } from "@/components/pages/KeamananView";
import { RequireRoute } from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Keamanan Akun" };

export default function Page() {
  return (
    <RequireRoute route="/keamanan">
      <KeamananView />
    </RequireRoute>
  );
}
