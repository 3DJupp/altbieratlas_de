#!/usr/bin/env node
// ============================================================
// Altbieratlas — Admin-User anlegen
// ============================================================
// Usage:
//   node scripts/create-admin.mjs <username> <password> [--remote]
//
// Erzeugt einen PBKDF2-Hash lokal und führt anschließend
// `wrangler d1 execute` aus, um den User einzufügen.
// ============================================================

import { execSync } from "node:child_process";
import { webcrypto as crypto } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ITER = 100000;

function b64(buf) {
  return Buffer.from(buf).toString("base64");
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password),
    { name: "PBKDF2" }, false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    key, 256,
  );
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(bits)}`;
}

async function main() {
  const [, , username, password, ...rest] = process.argv;
  const remote = rest.includes("--remote");
  const emailArg = rest.find((a) => a.startsWith("--email="));
  const email = emailArg ? emailArg.slice("--email=".length) : null;

  if (!username || !password) {
    console.error("Usage: node scripts/create-admin.mjs <username> <password> [--email=addr@example.com] [--remote]");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("FEHLER: Passwort muss mindestens 10 Zeichen lang sein.");
    process.exit(1);
  }

  const hash = await hashPassword(password);
  const esc = (s) => s.replace(/'/g, "''");
  const emailValue = email ? `'${esc(email)}'` : "NULL";
  const sql = [
    `DELETE FROM admin_users WHERE username = '${esc(username)}';`,
    `INSERT INTO admin_users (username, password_hash, email) VALUES (`,
    `  '${esc(username)}',`,
    `  '${esc(hash)}',`,
    `  ${emailValue}`,
    ");",
  ].join("\n");

  const tmp = join(tmpdir(), `altbier-admin-${Date.now()}.sql`);
  writeFileSync(tmp, sql);
  try {
    const dbName = process.env.D1_NAME || "my-d1-database";
    const cmd = `wrangler d1 execute ${dbName} ${remote ? "--remote" : "--local"} --file=${tmp}`;
    console.log(`→ ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
    console.log(`✓ Admin '${username}' wurde ${remote ? "remote" : "lokal"} angelegt.${email ? ` (E-Mail: ${email})` : " (keine E-Mail — Passwort-Reset nicht möglich)"}`);
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
