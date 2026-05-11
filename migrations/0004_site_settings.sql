-- ============================================================
-- Altbieratlas — site_settings (key-value config in D1)
-- ============================================================
-- Ermöglicht das Hinterlegen von Impressum-Daten und weiterer
-- Site-Konfiguration direkt im Admin-Bereich, ohne Cloudflare-
-- Dashboard-Zugriff zu benötigen.
-- ============================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
