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

const ITER = 120000;

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

  if (!username || !password) {
    console.error("Usage: node scripts/create-admin.mjs <username> <password> [--remote]");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("FEHLER: Passwort muss mindestens 10 Zeichen lang sein.");
    process.exit(1);
  }

  const hash = await hashPassword(password);
  const sql = [
    "DELETE FROM admin_users WHERE username = '" + username.replace(/'/g, "''") + "';",
    "INSERT INTO admin_users (username, password_hash) VALUES (",
    `  '${username.replace(/'/g, "''")}',`,
    `  '${hash.replace(/'/g, "''")}'`,
    ");",
  ].join("\n");

  const tmp = join(tmpdir(), `altbier-admin-${Date.now()}.sql`);
  writeFileSync(tmp, sql);
  try {
    const cmd = `wrangler d1 execute altbieratlas ${remote ? "--remote" : "--local"} --file=${tmp}`;
    console.log(`→ ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
    console.log(`✓ Admin '${username}' wurde ${remote ? "remote" : "lokal"} angelegt.`);
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
