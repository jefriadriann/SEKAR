#!/usr/bin/env node
/**
 * Pemindai secret sederhana (tanpa dependensi). NILAI secret tidak pernah dicetak —
 * hanya lokasi dan jenis temuan.
 *
 *   node scripts/check-secrets.mjs            # file yang dilacak git
 *   node scripts/check-secrets.mjs --bundle   # aset browser hasil build (.next/static, .next-supabase/static)
 *   node scripts/check-secrets.mjs --history  # seluruh riwayat git (git log -p --all)
 *
 * Keluar dengan kode 1 bila ada temuan.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function jwtRole(token) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).role ?? null;
  } catch {
    return null;
  }
}

/** Aturan: [nama, regex, validator opsional]. Regex harus memakai flag g. */
export const RULES = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g],
  ["supabase-secret-key", /\bsb_secret_[A-Za-z0-9_-]{10,}/g],
  ["supabase-service-role-jwt", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, (m) => jwtRole(m) === "service_role"],
  ["service-role-env-assignment", /SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*["']?[A-Za-z0-9._-]{20,}/g],
  ["github-token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{50,}/g],
  ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["vercel-token-assignment", /VERCEL_TOKEN\s*[=:]\s*["']?[A-Za-z0-9]{20,}/g],
  ["postgres-url-with-password", /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]{6,}@[^\s"']+/g, (m) => !/:(password|PASSWORD|\[YOUR-PASSWORD\]|postgres)@/.test(m)],
];

/** Pindai teks; kembalikan temuan {rule, line} tanpa nilai. */
export function scanText(text) {
  const out = [];
  for (const [rule, re, ok] of RULES) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      if (ok && !ok(m[0])) continue;
      out.push({ rule, line: text.slice(0, m.index).split("\n").length });
    }
  }
  return out;
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

const BINARY = /\.(png|jpe?g|webp|gif|ico|mp4|webm|pdf|xlsx|woff2?|ttf)$/i;

function main() {
  const mode = process.argv[2] ?? "--tracked";
  const findings = [];
  if (mode === "--bundle") {
    const roots = [".next/static", ".next-supabase/static"].filter(existsSync);
    if (!roots.length) {
      console.error("Tidak ada build. Jalankan `npm run build` dulu.");
      process.exit(2);
    }
    for (const f of roots.flatMap((r) => walk(r)).filter((f) => !BINARY.test(f)))
      for (const x of scanText(readFileSync(f, "utf8"))) findings.push({ file: f, ...x });
    console.log(`Dipindai: ${roots.join(", ")}`);
  } else if (mode === "--history") {
    const log = execFileSync("git", ["log", "-p", "--all", "--no-color", "--format=commit %H"], { maxBuffer: 1 << 30 }).toString();
    let commit = "?";
    for (const chunk of log.split(/^(?=commit [0-9a-f]{40}$)/m)) {
      commit = chunk.match(/^commit ([0-9a-f]{40})/)?.[1] ?? commit;
      const added = chunk.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
      for (const x of scanText(added)) findings.push({ file: `commit ${commit.slice(0, 10)}`, rule: x.rule, line: "-" });
    }
    console.log("Dipindai: seluruh riwayat git (baris yang ditambahkan).");
  } else {
    const files = execFileSync("git", ["ls-files", "-z"]).toString().split("\0").filter(Boolean);
    for (const f of files.filter((f) => !BINARY.test(f) && existsSync(f)))
      for (const x of scanText(readFileSync(f, "utf8"))) findings.push({ file: f, ...x });
    console.log(`Dipindai: ${files.length} file yang dilacak git.`);
  }
  if (findings.length) {
    console.error(`DITEMUKAN ${findings.length} kemungkinan secret (nilai disembunyikan):`);
    for (const f of findings) console.error(`  - ${f.rule} @ ${f.file}:${f.line}`);
    process.exit(1);
  }
  console.log("Tidak ada secret berhak istimewa yang terdeteksi.");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
