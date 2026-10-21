import type { NextConfig } from "next";

/**
 * Security headers untuk seluruh rute.
 *
 * CSP: Next.js App Router pada halaman statis menyisipkan skrip inline
 * (payload RSC), sehingga script-src memerlukan 'unsafe-inline' kecuali
 * memakai nonce — dan nonce memaksa seluruh halaman dirender dinamis.
 * Kompromi ini didokumentasikan di SECURITY.md. Sumber lain dibatasi ketat:
 * tidak ada skrip/gaya pihak ketiga, koneksi hanya ke origin sendiri dan
 * proyek Supabase yang dikonfigurasi, tanpa plugin/objek, tanpa framing
 * lintas origin.
 */
function supabaseOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return [];
  try {
    const origin = new URL(raw).origin;
    return [origin, origin.replace(/^http/, "ws")];
  } catch {
    return [];
  }
}

const isDev = process.env.NODE_ENV !== "production";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  ["connect-src 'self'", ...supabaseOrigins()].join(" "),
  "media-src 'self' blob:",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // SAMEORIGIN (bukan DENY): pratinjau PDF memakai iframe ke berkas di origin sendiri.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Build e2e mode Supabase memakai direktori terpisah agar tidak menimpa build utama.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
