import { describe, expect, it, vi } from "vitest";
import { privilegedKeyProblem, readAppConfig } from "@/lib/config";
import { bearerToken, handleSignedUrl, type SecurityEvent, type SignedUrlDeps, type VerifiedClaims } from "@/lib/server/signed-url";

const NOW = 1_800_000_000_000;
const TOKEN = "header.payload-aal2.signature";
const fakeJwt = (payload: object) => `xx.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.yy`;

function deps(over: Partial<SignedUrlDeps> & { claims?: VerifiedClaims | null } = {}) {
  const logs: SecurityEvent[] = [];
  const d: SignedUrlDeps & { logs: SecurityEvent[] } = {
    logs,
    verifyToken: vi.fn(async () => (over.claims === undefined ? { sub: "u-kpw01", role: "authenticated", aal: "aal2", exp: NOW / 1000 + 600 } : over.claims)),
    consumeRateLimit: vi.fn(async () => true),
    findDocument: vi.fn(async (id: string) => ({ ok: true as const, doc: { id, storage_path: `kpw-01/${id}.pdf` } })),
    createSignedUrl: vi.fn(async () => "https://proyek.example/storage/v1/object/sign/x?token=signed"),
    log: (e) => logs.push(e),
    now: () => NOW,
    ...over,
  };
  return d;
}
const call = (d: SignedUrlDeps, authorization: string | null = `Bearer ${TOKEN}`, id = "DOC-0001") => handleSignedUrl({ authorization, id }, d);

describe("API signed-url: autentikasi, MFA, otorisasi", () => {
  it("tanpa token → 401 dan tidak menyentuh database", async () => {
    const d = deps();
    expect((await call(d, null)).status).toBe(401);
    expect((await call(d, "Basic abc")).status).toBe(401);
    expect((await call(d, "Bearer ")).status).toBe(401);
    expect(d.verifyToken).not.toHaveBeenCalled();
    expect(d.findDocument).not.toHaveBeenCalled();
  });

  it("token tidak valid, kedaluwarsa, error verifikasi, atau bukan role authenticated → 401", async () => {
    expect((await call(deps({ claims: null }))).status).toBe(401);
    expect((await call(deps({ claims: { sub: "u", role: "authenticated", aal: "aal2", exp: NOW / 1000 - 1 } }))).status).toBe(401);
    expect((await call(deps({ claims: { sub: "u", role: "anon", aal: "aal2", exp: NOW / 1000 + 60 } }))).status).toBe(401);
    expect((await call(deps({ verifyToken: async () => { throw new Error("jwks down"); } }))).status).toBe(401);
  });

  it("sesi belum MFA (aal1) → 403 dan tidak membaca dokumen", async () => {
    const d = deps({ claims: { sub: "u-kpw01", role: "authenticated", aal: "aal1", exp: NOW / 1000 + 600 } });
    const r = await call(d);
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ error: "Verifikasi MFA diperlukan." });
    expect(d.findDocument).not.toHaveBeenCalled();
    expect(d.consumeRateLimit).not.toHaveBeenCalled();
  });

  it("ID dimanipulasi (path traversal / karakter asing) → 400", async () => {
    for (const id of ["../dr/rahasia", "DOC-1' or '1'='1", "a".repeat(65), ""]) {
      const d = deps();
      expect((await call(d, `Bearer ${TOKEN}`, id)).status).toBe(400);
      expect(d.findDocument).not.toHaveBeenCalled();
    }
  });

  it("dokumen unit lain (RLS tidak mengembalikan baris) → 403, tanpa signed URL", async () => {
    const d = deps({ findDocument: async () => ({ ok: true, doc: null }) });
    expect((await call(d, `Bearer ${TOKEN}`, "DOC-0002")).status).toBe(403);
    expect(d.createSignedUrl).not.toHaveBeenCalled();
  });

  it("policy storage menolak → 403", async () => {
    expect((await call(deps({ createSignedUrl: async () => null }))).status).toBe(403);
  });

  it("rate limit terlampaui → 429; pemeriksaan gagal → 503 (fail closed)", async () => {
    expect((await call(deps({ consumeRateLimit: async () => false }))).status).toBe(429);
    expect((await call(deps({ consumeRateLimit: async () => null }))).status).toBe(503);
    expect((await call(deps({ consumeRateLimit: async () => { throw new Error("x"); } }))).status).toBe(503);
  });

  it("pengguna MFA yang berhak mendapat signed URL berumur pendek", async () => {
    const d = deps();
    const r = await call(d);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ expiresIn: 60 });
  });

  it("log keamanan tidak memuat token maupun signed URL", async () => {
    const d = deps();
    await call(d);
    await call(deps({ claims: null }), `Bearer ${TOKEN}`);
    await call(d, `Bearer ${TOKEN}`, "../x");
    const text = JSON.stringify(d.logs);
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain("token=signed");
    expect(d.logs.map((l) => l.event)).toEqual(["signed_url_issued", "signed_url_denied"]);
  });

  it("bearerToken hanya menerima format Bearer yang wajar", () => {
    expect(bearerToken("Bearer abc.def-ghi")).toBe("abc.def-ghi");
    expect(bearerToken("bearer abc")).toBe("abc");
    expect(bearerToken("Bearer abc def")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});

describe("konfigurasi: secret tidak boleh menjadi variabel publik", () => {
  const base = { APP_DATA_MODE: "supabase", NEXT_PUBLIC_SUPABASE_URL: "https://proyek.example" };

  it("menolak service_role JWT dan secret key sebagai anon key, tanpa membocorkan nilainya", () => {
    for (const key of [fakeJwt({ role: "service_role" }), ["sb", "secret", "contohnilaiplaceholder"].join("_")]) {
      const c = readAppConfig({ ...base, NEXT_PUBLIC_SUPABASE_ANON_KEY: key });
      expect(c.configError).toMatch(/secret\/service-role/);
      expect(c.supabaseAnonKey).toBeUndefined();
      expect(JSON.stringify(c)).not.toContain(key);
    }
  });

  it("menolak variabel NEXT_PUBLIC_ bernama secret/service role", () => {
    expect(privilegedKeyProblem({ NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "x" })).toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
    expect(privilegedKeyProblem({ NEXT_PUBLIC_API_SECRET: "x" })).toMatch(/NEXT_PUBLIC_API_SECRET/);
  });

  it("menerima anon/publishable key dan menolak URL non-HTTPS", () => {
    expect(readAppConfig({ ...base, NEXT_PUBLIC_SUPABASE_ANON_KEY: fakeJwt({ role: "anon" }) }).configError).toBeUndefined();
    expect(readAppConfig({ ...base, NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_placeholder" }).configError).toBeUndefined();
    expect(readAppConfig({ ...base, NEXT_PUBLIC_SUPABASE_URL: "http://proyek.example", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_x" }).configError).toMatch(/https/);
    expect(readAppConfig({ ...base, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_x" }).configError).toBeUndefined();
  });
});

describe("pemindai secret (kontrol positif)", async () => {
  const { scanText } = (await import("../scripts/check-secrets.mjs")) as { scanText: (t: string) => { rule: string; line: number }[] };
  // Contoh dirakit saat runtime agar file ini sendiri tidak memuat pola secret.
  const b = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const serviceJwt = ["eyJ" + b({ alg: "HS256" }).slice(3), b({ role: "service_role", iss: "supabase" }), "a".repeat(20)].join(".");
  const anonJwt = ["eyJ" + b({ alg: "HS256" }).slice(3), b({ role: "anon", iss: "supabase" }), "a".repeat(20)].join(".");

  it("mendeteksi service-role JWT, secret key, private key, token GitHub — tanpa mengembalikan nilainya", () => {
    const text = [`x = "${serviceJwt}"`, "k=" + "sb_" + "secret_" + "A".repeat(24), "-----BEGIN " + "PRIVATE KEY-----", "t=" + "ghp_" + "B".repeat(36)].join("\n");
    const found = scanText(text);
    expect(found.map((f) => f.rule).sort()).toEqual(["github-token", "private-key", "supabase-secret-key", "supabase-service-role-jwt"]);
    expect(JSON.stringify(found)).not.toContain("secret_A");
  });

  it("tidak menandai anon/publishable key yang memang publik", () => {
    expect(scanText(`a="${anonJwt}" b="sb_publishable_abc123"`)).toEqual([]);
  });
});

describe("resolusi mode data per deployment (preview branch keamanan)", async () => {
  const { resolveDataEnv, preview } = (await import("../config/data-env.cjs")) as {
    resolveDataEnv: (env: Record<string, string | undefined>, cfg?: object) => Record<string, string | undefined>;
    preview: { branches: string[]; supabaseUrl: string; supabaseAnonKey: string };
  };
  const cfg = { branches: ["claude/demo-aset-sgo-q2logj"], supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co", supabaseAnonKey: "sb_publishable_contoh" };
  const branch = cfg.branches[0];

  it("hanya Preview dari branch terdaftar yang memakai proyek uji", () => {
    expect(resolveDataEnv({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: branch }, cfg).APP_DATA_MODE).toBe("supabase");
    expect(resolveDataEnv({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "main" }, cfg).APP_DATA_MODE).toBeUndefined();
    expect(resolveDataEnv({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: branch }, cfg).APP_DATA_MODE).toBeUndefined();
    expect(resolveDataEnv({}, cfg).APP_DATA_MODE).toBeUndefined();
  });

  it("variabel lingkungan eksplisit selalu didahulukan; konfigurasi kosong = dummy", () => {
    expect(resolveDataEnv({ APP_DATA_MODE: "dummy", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: branch }, cfg).APP_DATA_MODE).toBe("dummy");
    expect(resolveDataEnv({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: branch }, { ...cfg, supabaseAnonKey: "" }).APP_DATA_MODE).toBeUndefined();
    const c = readAppConfig({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: branch });
    expect(c.mode).toBe("dummy");
  });

  it("konfigurasi preview di repo hanya berisi nilai publik (bukan secret/service-role)", () => {
    expect(preview.branches).toEqual(["claude/demo-aset-sgo-q2logj"]);
    expect(privilegedKeyProblem({ NEXT_PUBLIC_SUPABASE_ANON_KEY: preview.supabaseAnonKey })).toBeNull();
    if (preview.supabaseUrl) expect(preview.supabaseUrl).toMatch(/^https:\/\/[a-z0-9]{20}\.supabase\.co$/);
  });
});
