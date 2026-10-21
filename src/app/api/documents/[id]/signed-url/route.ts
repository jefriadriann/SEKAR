import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { readAppConfig } from "@/lib/config";
import { bearerToken, handleSignedUrl, SIGNED_URL_RATE, type SecurityEvent } from "@/lib/server/signed-url";

export const dynamic = "force-dynamic";

const BUCKET = "sekar-documents";
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" };

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: NO_STORE });
}

/** Log keamanan terstruktur (Vercel Runtime Logs). Tidak memuat token atau URL bertanda tangan. */
function securityLog(e: SecurityEvent) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...e });
  if (e.event === "signed_url_denied") console.warn(line);
  else console.info(line);
}

/**
 * Signed URL dokumen privat. Tidak memakai service-role key: semua akses data
 * memakai token pengguna sehingga RLS + policy storage tetap berlaku.
 * Lihat src/lib/server/signed-url.ts untuk urutan pemeriksaan.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const config = readAppConfig();
  if (config.mode !== "supabase") return json({ error: "Tidak tersedia pada mode dummy." }, 404);
  if (config.configError || !config.supabaseUrl || !config.supabaseAnonKey) return json({ error: "Konfigurasi Supabase belum lengkap." }, 500);

  const authorization = request.headers.get("authorization");
  const token = bearerToken(authorization) ?? "";
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { id } = await ctx.params;

  const result = await handleSignedUrl(
    { authorization, id },
    {
      async verifyToken(t) {
        const { data, error } = await supabase.auth.getClaims(t);
        if (error || !data) return null;
        const c = data.claims;
        return { sub: c.sub, role: c.role, aal: c.aal, exp: c.exp };
      },
      async consumeRateLimit() {
        const { data, error } = await supabase.rpc("consume_rate_limit", {
          p_bucket: SIGNED_URL_RATE.bucket,
          p_max: SIGNED_URL_RATE.max,
          p_window_seconds: SIGNED_URL_RATE.windowSeconds,
        });
        return error ? null : data === true;
      },
      async findDocument(docId) {
        const { data, error } = await supabase.from("documents").select("id, storage_path").eq("id", docId).maybeSingle();
        return error ? { ok: false } : { ok: true, doc: data };
      },
      async createSignedUrl(path, ttl) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttl);
        return error || !data ? null : data.signedUrl;
      },
      log: securityLog,
    },
  );
  return json(result.body, result.status);
}
