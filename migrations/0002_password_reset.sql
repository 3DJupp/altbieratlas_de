-- ============================================================
-- Altbieratlas — Passwort-Reset via E-Mail (Migration 0002)
-- ============================================================

-- E-Mail-Adresse für Admin-User (für Passwort-Reset)
ALTER TABLE admin_users ADD COLUMN email TEXT;

-- Einmalige, zeitlich begrenzte Reset-Token
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token      TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (username) REFERENCES admin_users(username) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reset_expires ON password_reset_tokens(expires_at);
