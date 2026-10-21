/**
 * Tiruan Supabase Auth (GoTrue) + PostgREST di tingkat jaringan browser untuk
 * e2e mode Supabase. Meniru perilaku yang relevan untuk MFA:
 *   - login password → token aal1; verifikasi TOTP → token aal2,
 *   - tabel data hanya mengembalikan baris bila token aal2 (meniru RLS 0003),
 *   - user_access baris sendiri boleh dibaca pada aal1.
 * Kode TOTP yang dianggap benar: 123456. Data dari data/sekar-dummy.json (unit kpw-01).
 * Ini bukan pengganti uji terhadap proyek Supabase sungguhan.
 */
import type { Page, Route } from "@playwright/test";
import seed from "../data/sekar-dummy.json" with { type: "json" };

export const SUPABASE_URL = "https://proyek-uji.supabase.co";
export const VALID_CODE = "123456";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const UNIT = "kpw-01";

type Factor = { id: string; factor_type: "totp"; status: "verified" | "unverified"; friendly_name: string; created_at: string; updated_at: string };

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
export function jwt(aal: "aal1" | "aal2", sessionId = "s1") {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
    sub: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    aal,
    amr: aal === "aal2" ? [{ method: "totp", timestamp: now }, { method: "password", timestamp: now }] : [{ method: "password", timestamp: now }],
    email: "kpw01@contoh.test",
    session_id: sessionId,
    iat: now,
    exp: now + 3600,
  })}.c2lnbmF0dXJl`;
}
const aalOf = (auth: string | undefined) => {
  const token = auth?.replace(/^Bearer\s+/i, "") ?? "";
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()).aal as string | undefined;
  } catch {
    return undefined;
  }
};

const TABLES: Record<string, unknown[]> = (() => {
  const d = seed as unknown as Record<string, unknown[]> & { metadata: Record<string, unknown> };
  const own = (r: { unit_id?: string }) => r.unit_id === UNIT;
  const scoped = (r: { scope?: string }) => r.scope === "shared" || r.scope === UNIT;
  return {
    dataset_metadata: [{ id: 1, ...d.metadata }],
    units: (d.units as { id: string }[]).filter((u) => u.id === UNIT),
    findings: (d.findings as { unit_id: string }[]).filter(own),
    document_requests: (d.document_requests as { unit_id: string }[]).filter(own),
    audit_schedules: (d.audit_schedules as { unit_id: string }[]).filter(own),
    reference_materials: (d.references as { scope: string }[]).filter(scoped),
    documents: (d.documents as { scope: string }[]).filter(scoped),
    compliance_items: [],
    asset_reconciliations: (d.asset_reconciliations as { unit_id: string }[]).filter(own),
    asset_items: (d.asset_items as { unit_id: string }[]).filter(own),
  };
})();

export interface MockState {
  password: string;
  factors: Factor[];
  /** Setiap permintaan data tabel dicatat beserta aal token pemanggil. */
  dataRequests: { table: string; aal: string | undefined }[];
  passwordUpdates: { aal: string | undefined }[];
  aal: "aal1" | "aal2";
}

export async function mockSupabase(page: Page, opts: { factors?: "none" | "one" } = {}): Promise<MockState> {
  const ts = new Date().toISOString();
  const state: MockState = {
    password: "KataSandiUji#2026",
    factors: opts.factors === "one" ? [{ id: "f-existing", factor_type: "totp", status: "verified", friendly_name: "Authenticator lama", created_at: ts, updated_at: ts }] : [],
    dataRequests: [],
    passwordUpdates: [],
    aal: "aal1",
  };
  let nextId = 1;
  const user = () => ({
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "kpw01@contoh.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: ts,
    factors: state.factors,
  });
  const session = (aal: "aal1" | "aal2") => {
    state.aal = aal;
    return { access_token: jwt(aal), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `r-${aal}`, user: user() };
  };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });

  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    const auth = req.headers()["authorization"];
    if (method === "OPTIONS")
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });

    // ---------------------------------------------------------------- Auth
    if (path === "/auth/v1/token") {
      const body = req.postDataJSON() ?? {};
      if (url.searchParams.get("grant_type") === "password") {
        if (body.password !== state.password) return json(route, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" }, 400);
        return json(route, session("aal1"));
      }
      return json(route, session(state.aal)); // refresh_token
    }
    if (path === "/auth/v1/user" && method === "GET") return auth ? json(route, user()) : json(route, { msg: "no auth" }, 401);
    if (path === "/auth/v1/user" && method === "PUT") {
      state.passwordUpdates.push({ aal: aalOf(auth) });
      return json(route, user());
    }
    if (path === "/auth/v1/logout") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    if (path === "/auth/v1/recover") return json(route, {});
    if (path === "/auth/v1/factors" && method === "POST") {
      const body = req.postDataJSON();
      const id = `f-${nextId++}`;
      state.factors.push({ id, factor_type: "totp", status: "unverified", friendly_name: body.friendly_name, created_at: ts, updated_at: ts });
      return json(route, {
        id,
        type: "totp",
        friendly_name: body.friendly_name,
        totp: { qr_code: "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10'/></svg>", secret: "PLACEHOLDERSECRET", uri: "otpauth://totp/x" },
      });
    }
    const m = path.match(/^\/auth\/v1\/factors\/([^/]+)(?:\/(challenge|verify))?$/);
    if (m) {
      const [, id, action] = m;
      const factor = state.factors.find((f) => f.id === id);
      if (!factor) return json(route, { msg: "Factor not found" }, 404);
      if (method === "DELETE") {
        if (factor.status === "verified" && aalOf(auth) !== "aal2") return json(route, { msg: "AAL2 required" }, 403);
        state.factors = state.factors.filter((f) => f.id !== id);
        return json(route, { id });
      }
      if (action === "challenge") return json(route, { id: `c-${nextId++}`, type: "totp", expires_at: Math.floor(Date.now() / 1000) + 300 });
      if (action === "verify") {
        if (req.postDataJSON()?.code !== VALID_CODE) return json(route, { code: 422, error_code: "mfa_verification_failed", msg: "Invalid TOTP code entered" }, 422);
        factor.status = "verified";
        return json(route, session("aal2"));
      }
    }

    // ---------------------------------------------------------------- PostgREST (meniru RLS)
    const t = path.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
    if (t === "user_access") return json(route, [{ user_id: USER_ID, role: "kpw", unit_id: UNIT, display_name: "KPw Uji MFA" }]);
    if (t && t in TABLES) {
      const aal = aalOf(auth);
      state.dataRequests.push({ table: t, aal });
      const rows = aal === "aal2" ? TABLES[t] : [];
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? rows.length);
      return json(route, rows.slice(offset, offset + limit));
    }
    return json(route, { msg: `tidak ditiru: ${method} ${path}` }, 404);
  });
  return state;
}
