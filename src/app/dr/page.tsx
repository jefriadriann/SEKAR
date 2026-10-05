import type { Metadata } from "next";
import { DrView } from "@/components/pages/DrView";
import { RequireRoute } from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Dashboard Departemen Regional" };

export default function Page() {
  return (
    <RequireRoute route="/dr">
      <DrView />
    </RequireRoute>
  );
}
