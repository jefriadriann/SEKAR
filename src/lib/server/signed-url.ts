/**
 * Logika endpoint GET /api/documents/[id]/signed-url, dipisah dari route agar
 * dapat diuji tanpa Supabase sungguhan. Urutan pemeriksaan (deny-by-default):
 *   1. Bearer token wajib ada dan lolos verifikasi resmi Supabase (getClaims:
 *      tanda tangan + kedaluwarsa), role "authenticated".
 *   2. Sesi wajib AAL2 (sudah MFA). Database juga menegakkan ini lewat RLS.
 *   3. ID dokumen divalidasi formatnya.
 *   4. Rate limit per pengguna (disimpan di Postgres, aman untuk serverless).
 *   5. Baris dokumen dibaca dengan token pengguna → RLS memutuskan izin.
 *   6. Signed URL dibuat dengan token pengguna → policy storage memeriksa lagi.
 * Token, klaim mentah, dan URL bertanda tangan tidak pernah ditulis ke log.
 */

export const SIGNED_URL_TTL_SECONDS = 60;
export const SIGNED_URL_RATE = { bucket: "signed_url", max: 30, windowSeconds: 60 } as const;
const DOC_ID = /^[A-Za-z0-9_-]{1,64}$/;

export interface VerifiedClaims {
  sub: string;
  role?: string;
  aal?: string;
  exp?: number;
}

export interface SignedUrlDeps {
  /** Verifikasi token dengan mekanisme resmi Supabase; null bila tidak valid/kedaluwarsa. */
  verifyToken(token: string): Promise<VerifiedClaims | null>;
  /** true = boleh lanjut, false = melebihi batas, null = gagal memeriksa. */
  consumeRateLimit(): Promise<boolean | null>;
  findDocument(id: string): Promise<{ ok: true; doc: { id: string; storage_path: string | null } | null } | { ok: false }>;
  createSignedUrl(path: string, ttlSeconds: number): Promise<string | null>;
  log(event: SecurityEvent): void;
  now?: () => number;
}

export interface SecurityEvent {
  event: "signed_url_denied" | "signed_url_issued";
  reason?: string;
  /** ID pengguna (bukan token). */
  user?: string;
  doc?: string;
}

export interface HandlerResult {
  status: number;
  body: { error: string } | { url: string; expiresIn: number };
}

export function bearerToken(header: string | null): string | null {
  const m = header?.match(/^Bearer\s+([A-Za-z0-9._~+/=-]+)$/i);
  return m ? m[1] : null;
}

export async function handleSignedUrl(input: { authorization: string | null; id: string }, deps: SignedUrlDeps): Promise<HandlerResult> {
  const deny = (status: number, error: string, reason: string, user?: string): HandlerResult => {
    deps.log({ event: "signed_url_denied", reason, user, doc: DOC_ID.test(input.id) ? input.id : undefined });
    return { status, body: { error } };
  };

  const token = bearerToken(input.authorization);
  if (!token) return deny(401, "Sesi tidak ditemukan.", "no_token");

  let claims: VerifiedClaims | null;
  try {
    claims = await deps.verifyToken(token);
  } catch {
    claims = null;
  }
  const now = (deps.now ?? Date.now)() / 1000;
  if (!claims || !claims.sub || claims.role !== "authenticated" || (claims.exp !== undefined && claims.exp <= now)) {
    return deny(401, "Sesi tidak valid atau kedaluwarsa.", "invalid_token");
  }
  if (claims.aal !== "aal2") return deny(403, "Verifikasi MFA diperlukan.", "aal1", claims.sub);
  if (!DOC_ID.test(input.id)) return deny(400, "ID dokumen tidak valid.", "bad_id", claims.sub);

  const allowed = await deps.consumeRateLimit().catch(() => null);
  if (allowed === null) return deny(503, "Layanan sementara tidak tersedia.", "rate_limit_error", claims.sub);
  if (!allowed) return deny(429, "Terlalu banyak permintaan. Coba lagi sebentar.", "rate_limited", claims.sub);

  const found = await deps.findDocument(input.id);
  if (!found.ok) return deny(500, "Gagal memeriksa izin dokumen.", "db_error", claims.sub);
  if (!found.doc) return deny(403, "Dokumen tidak ditemukan atau tidak berwenang.", "not_found_or_forbidden", claims.sub);
  if (!found.doc.storage_path) return deny(404, "Dokumen tidak memiliki berkas di storage.", "no_file", claims.sub);

  const url = await deps.createSignedUrl(found.doc.storage_path, SIGNED_URL_TTL_SECONDS);
  if (!url) return deny(403, "Tidak berwenang membuka berkas ini.", "storage_denied", claims.sub);
  deps.log({ event: "signed_url_issued", user: claims.sub, doc: input.id });
  return { status: 200, body: { url, expiresIn: SIGNED_URL_TTL_SECONDS } };
}
