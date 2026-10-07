import type { Metadata } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { SekarProvider } from "@/components/providers/SekarProvider";
import { readAppConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: "SEKAR — Mode Demo", template: "%s · SEKAR" },
  description: "SEKAR (Sistem Informasi Evaluasi Kepatuhan, Audit & Risiko) — aplikasi demonstrasi dengan data simulasi.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Konfigurasi dibaca di server; hanya nilai publik yang diteruskan ke browser.
  const config = readAppConfig();
  return (
    <html lang="id">
      <body>
        <SekarProvider config={config}>
          <AppShell>{children}</AppShell>
        </SekarProvider>
      </body>
    </html>
  );
}
