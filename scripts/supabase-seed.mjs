#!/usr/bin/env node
/**
 * Menjalankan supabase/seed.sql UTUH ke proyek Supabase (tanpa batas ukuran SQL Editor)
 * dengan verifikasi target, transaksi, dan verifikasi hasil per tabel.
 *
 *   node scripts/supabase-seed.mjs --check   # hanya baca: identitas target + isi tabel saat ini
 *   node scripts/supabase-seed.mjs --apply   # check → seed dalam satu transaksi → verifikasi
 *
 * Koneksi (pilih salah satu; kredensial hanya dari environment, tidak pernah dicetak):
 *   A. psql langsung (disarankan, dari komputer Anda):
 *        SUPABASE_PROJECT_REF=<ref proyek>   (bukan secret; terlihat di URL dashboard)
 *        SUPABASE_DB_URL=<connection string Session pooler / Direct>   (secret)
 *   B. Supabase Management API (HTTPS):
 *        SUPABASE_PROJECT_REF=<ref proyek>
 *        SUPABASE_ACCESS_TOKEN=<personal access token>   (secret)
 *        Jalur B BELUM TERUJI terhadap Supabase sungguhan; batas ukuran query API tidak terdokumentasi.
 *
 * Opsional: SUPABASE_EXPECTED_PROJECT_NAME (default "sekar-security-test", diperiksa pada jalur B).
 * Khusus uji lokal: SEKAR_SEED_ALLOW_LOCAL=1 mengizinkan host localhost tanpa ref proyek.
 *
 * Seed memakai `on conflict (id) do nothing`: baris yang sudah ada dipertahankan, tidak ada
 * DELETE/TRUNCATE. Bila satu pernyataan gagal, seluruh transaksi dibatalkan (ON_ERROR_STOP).
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = join(root, "supabase/seed.sql");

/** Tabel seed (urutan foreign key) → koleksi di data/sekar-dummy.json. */
export const SEED_TABLES = [
  ["dataset_metadata", null],
  ["units", "units"],
  ["documents", "documents"],
  ["findings", "findings"],
  ["audit_schedules", "audit_schedules"],
  ["document_requests", "document_requests"],
  ["reference_materials", "references"],
  ["compliance_items", "compliance"],
  ["asset_reconciliations", "asset_reconciliations"],
  ["asset_items", "asset_items"],
];

const fail = (msg) => {
  const e = new Error(msg);
  e.userFacing = true;
  throw e;
};

/** Hash ID terurut (byte order, sama dengan `collate "C"` di Postgres). */
export function idDigest(ids) {
  const sorted = [...ids].map(String).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { count: sorted.length, md5: createHash("md5").update(sorted.join(",")).digest("hex") };
}

/** Jumlah & digest ID yang diharapkan, dihitung dari dataset sumber seed. */
export function expectedFromDataset(ds) {
  const out = {};
  for (const [table, key] of SEED_TABLES) out[table] = idDigest(key ? ds[key].map((r) => r.id) : [1]);
  return out;
}

const DIGEST_SQL = SEED_TABLES.map(
  ([t]) =>
    `select '${t}' as t, count(*)::int as n, coalesce(md5(string_agg(id::text, ',' order by id::text collate "C")), md5('')) as h from public.${t}`,
).join(" union all ");

// ------------------------------------------------------------------ transport
function parseDbUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    fail("SUPABASE_DB_URL bukan connection string yang valid (format postgresql://...).");
  }
  if (!/^postgres(ql)?:$/.test(u.protocol)) fail("SUPABASE_DB_URL harus diawali postgresql://");
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")) || "postgres",
  };
}

const isLocalHost = (h) => h === "localhost" || h === "127.0.0.1" || h === "::1" || h.startsWith("/");

/** Pastikan connection string menunjuk ke proyek yang dimaksud (ref ada di host atau user). */
export function assertTargetRef(conn, ref, allowLocal) {
  if (isLocalHost(conn.host)) {
    if (!allowLocal) fail("Host lokal ditolak. Set SEKAR_SEED_ALLOW_LOCAL=1 hanya untuk uji lokal.");
    return "lokal (uji)";
  }
  if (!ref || !/^[a-z0-9]{20}$/.test(ref)) fail("SUPABASE_PROJECT_REF wajib diisi (20 karakter huruf kecil/angka, dari URL dashboard).");
  const hostRef = conn.host.match(/^db\.([a-z0-9]{20})\.supabase\.co$/)?.[1];
  const userRef = conn.user.match(/^postgres\.([a-z0-9]{20})$/)?.[1];
  const found = hostRef ?? userRef;
  if (!found) fail("Connection string bukan format Supabase (db.<ref>.supabase.co atau user postgres.<ref>). Dibatalkan.");
  if (found !== ref) fail("Connection string menunjuk ke proyek lain (ref tidak cocok dengan SUPABASE_PROJECT_REF). Dibatalkan.");
  return `proyek ${ref} (${hostRef ? "direct" : "pooler"})`;
}

function psqlTransport(conn) {
  const env = {
    ...process.env,
    PGHOST: conn.host,
    PGPORT: conn.port,
    PGUSER: conn.user,
    PGPASSWORD: conn.password,
    PGDATABASE: conn.database,
    PGSSLMODE: isLocalHost(conn.host) ? "disable" : "require",
    PGCONNECT_TIMEOUT: "15",
    PGAPPNAME: "sekar-seed",
  };
  delete env.SUPABASE_DB_URL;
  const base = ["-X", "-q", "-v", "ON_ERROR_STOP=1"];
  const clean = (s) => String(s ?? "").replaceAll(conn.password || "\u0000", "***");
  return {
    async query(sql) {
      try {
        const { stdout } = await run("psql", [...base, "-t", "-A", "-F", "\t", "-c", sql], { env, maxBuffer: 1 << 26 });
        return stdout.trim() ? stdout.trim().split("\n").map((l) => l.split("\t")) : [];
      } catch (e) {
        fail(`Query gagal: ${clean(e.stderr || e.message).trim()}`);
      }
    },
    async runFile(path) {
      try {
        await run("psql", [...base, "-f", path], { env, maxBuffer: 1 << 26 });
      } catch (e) {
        fail(`Seed gagal dan dibatalkan (rollback): ${clean(e.stderr || e.message).trim().split("\n").slice(-3).join(" | ")}`);
      }
    },
  };
}

function apiTransport(ref, token) {
  const api = async (path, init = {}) => {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const text = await res.text();
    if (!res.ok) fail(`Management API ${res.status}: ${text.replaceAll(token, "***").slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  };
  const query = async (sql) => {
    const rows = await api("/database/query", { method: "POST", body: JSON.stringify({ query: sql }) });
    return (rows ?? []).map((r) => Object.values(r).map(String));
  };
  return {
    async projectName() {
      const p = await fetch(`https://api.supabase.com/v1/projects/${ref}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!p.ok) fail(`Tidak dapat membaca proyek ${ref} (HTTP ${p.status}).`);
      return (await p.json()).name;
    },
    query,
    async runFile(path) {
      await query(readFileSync(path, "utf8"));
    },
  };
}

// ------------------------------------------------------------------ langkah
async function inspect(db) {
  const [[database, user, has0001, has0002Table, has0002Col, has0003, hasAuth]] = await db.query(
    `select current_database(), current_user,
            (to_regclass('public.user_access') is not null)::text,
            (to_regclass('public.asset_items') is not null)::text,
            (exists (select 1 from information_schema.columns where table_schema='public' and table_name='documents' and column_name='file_url'))::text,
            (to_regclass('public.rate_limits') is not null)::text,
            (to_regclass('auth.users') is not null)::text`,
  );
  if (has0001 !== "true") fail("Migration 0001 belum ada di database ini (tabel user_access tidak ditemukan). Dibatalkan.");
  if (has0002Table !== "true" || has0002Col !== "true") fail("Migration 0002 belum lengkap (asset_items / documents.file_url). Dibatalkan.");
  if (hasAuth !== "true") fail("Skema auth Supabase tidak ditemukan. Dibatalkan.");
  const authUsers = (await db.query("select count(*) from auth.users"))[0][0];
  const digests = Object.fromEntries((await db.query(DIGEST_SQL)).map(([t, n, h]) => [t, { count: Number(n), md5: h }]));
  return { database, user, has0003: has0003 === "true", authUsers: Number(authUsers), digests };
}

function compare(expected, actual) {
  return SEED_TABLES.map(([t]) => ({ table: t, expected: expected[t].count, actual: actual[t].count, idsMatch: expected[t].md5 === actual[t].md5 }));
}

function printTable(rows, title) {
  console.log(`\n${title}`);
  for (const r of rows)
    console.log(`  ${r.table.padEnd(22)} diharapkan ${String(r.expected).padStart(5)}  aktual ${String(r.actual).padStart(5)}  ${r.idsMatch ? "ID cocok" : r.actual === 0 ? "kosong" : "ID BERBEDA"}`);
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "--check" && mode !== "--apply") {
    console.log("Pemakaian: node scripts/supabase-seed.mjs --check | --apply   (lihat komentar di atas file)");
    process.exit(2);
  }
  const ref = process.env.SUPABASE_PROJECT_REF?.trim();
  const allowLocal = process.env.SEKAR_SEED_ALLOW_LOCAL === "1";
  let db;
  if (process.env.SUPABASE_DB_URL) {
    const conn = parseDbUrl(process.env.SUPABASE_DB_URL.trim());
    console.log(`Target: ${assertTargetRef(conn, ref, allowLocal)} · host ${conn.host}:${conn.port}`);
    db = psqlTransport(conn);
  } else if (process.env.SUPABASE_ACCESS_TOKEN) {
    if (!ref || !/^[a-z0-9]{20}$/.test(ref)) fail("SUPABASE_PROJECT_REF wajib diisi untuk jalur Management API.");
    db = apiTransport(ref, process.env.SUPABASE_ACCESS_TOKEN.trim());
    const expectedName = process.env.SUPABASE_EXPECTED_PROJECT_NAME ?? "sekar-security-test";
    const name = await db.projectName();
    if (name !== expectedName) fail(`Proyek ${ref} bernama "${name}", bukan "${expectedName}". Dibatalkan.`);
    console.log(`Target: proyek ${ref} bernama "${name}" (Management API)`);
  } else {
    fail("Kredensial tidak ditemukan. Set SUPABASE_DB_URL (disarankan) atau SUPABASE_ACCESS_TOKEN lewat environment / input tersembunyi.");
  }

  const ds = JSON.parse(readFileSync(join(root, "data/sekar-dummy.json"), "utf8"));
  if (ds.metadata?.all_data_is_synthetic !== true) fail("Dataset bukan data simulasi. Dibatalkan.");
  const expected = expectedFromDataset(ds);

  const before = await inspect(db);
  console.log(`Database ${before.database} sebagai ${before.user} · 0001 & 0002 ada · 0003 ${before.has0003 ? "SUDAH" : "belum"} diterapkan · akun auth: ${before.authUsers}`);
  const beforeRows = compare(expected, before.digests);
  printTable(beforeRows, "Isi saat ini:");
  if (mode === "--check") return;

  if (beforeRows.every((r) => r.idsMatch)) {
    console.log("\nSeluruh ID seed sudah ada. Tidak ada yang perlu ditulis.");
    return;
  }
  console.log("\nMenjalankan supabase/seed.sql utuh dalam satu transaksi (ON_ERROR_STOP)…");
  const started = Date.now();
  await db.runFile(SEED_PATH);
  console.log(`Seed selesai dalam ${((Date.now() - started) / 1000).toFixed(1)} detik.`);

  const after = await inspect(db);
  const afterRows = compare(expected, after.digests);
  printTable(afterRows, "Verifikasi setelah seed:");
  const bad = afterRows.filter((r) => !r.idsMatch);
  if (bad.length) fail(`Verifikasi GAGAL pada: ${bad.map((r) => r.table).join(", ")}. Periksa baris di luar seed atau ID yang hilang.`);
  console.log("\nVerifikasi LULUS: jumlah dan seluruh ID di 10 tabel sama dengan seed.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(`GAGAL: ${e.userFacing ? e.message : "kesalahan tak terduga (detail disembunyikan)."}`);
    process.exit(1);
  });
}
