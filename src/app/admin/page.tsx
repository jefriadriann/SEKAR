import type { Metadata } from "next";
import { AdminView } from "@/components/pages/AdminView";
import { RequireRoute } from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Admin Dataset" };

export default function Page() {
  return (
    <RequireRoute route="/admin">
      <AdminView />
    </RequireRoute>
  );
}
