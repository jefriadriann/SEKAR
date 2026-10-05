import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { readAppConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

const BUCKET = "sekar-documents";
const TTL_SECONDS = 60;

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Membuat signed URL dokumen HANYA setelah otorisasi:
 * 1) sesi Supabase divalidasi dari Bearer token,
 * 2) baris dokumen dibaca memakai token pengguna (RLS menolak bila tidak berhak),
 * 3) signed URL dibuat memakai token pengguna (policy storage juga memeriksa peran/unit).
 * Tidak memakai service-role key.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const config = readAppConfig();
  if (config.mode !== "supabase") return json({ error: "Tidak tersedia pada mode dummy." }, 404);
  if (config.configError || !config.supabaseUrl || !config.supabaseAnonKey) return json({ error: "Konfigurasi Supabase belum lengkap." }, 500);

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Sesi tidak ditemukan." }, 401);

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Sesi tidak valid atau kedaluwarsa." }, 401);

  const { id } = await ctx.params;
  const { data: doc, error } = await supabase.from("documents").select("id, storage_path").eq("id", id).maybeSingle();
  if (error) return json({ error: "Gagal memeriksa izin dokumen." }, 500);
  if (!doc) return json({ error: "Dokumen tidak ditemukan atau tidak berwenang." }, 403);
  if (!doc.storage_path) return json({ error: "Dokumen tidak memiliki berkas di storage." }, 404);

  const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, TTL_SECONDS);
  if (signError || !signed) return json({ error: "Tidak berwenang membuka berkas ini." }, 403);
  return json({ url: signed.signedUrl, expiresIn: TTL_SECONDS }, 200);
}
