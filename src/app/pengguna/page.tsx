import type { Metadata } from "next";
import { KelolaPenggunaView } from "@/components/pages/KelolaPenggunaView";
import { RequireRoute } from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Kelola Pengguna" };

export default function Page() {
  return (
    <RequireRoute route="/pengguna">
      <KelolaPenggunaView />
    </RequireRoute>
  );
}
