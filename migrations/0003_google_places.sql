-- ============================================================
-- Altbieratlas — Upgrade: Google Place IDs + Bewertungs-Cache
-- ============================================================
-- TEMPORÄR (Migrations-Policy in CLAUDE.md): nur für das Upgrade der
-- bestehenden Produktions-D1. Inhalt steht bereits in 0001_schema.sql;
-- nach dem Rollout wird diese Datei wieder gelöscht.
--
-- (1) BEREITS ANGEWENDET in Produktion (manuell per ALTER TABLE).
--     NICHT erneut ausführen, SQLite bricht mit "duplicate column" ab.
--
-- ALTER TABLE breweries ADD COLUMN google_place_id TEXT;
--
-- (2) Noch auszuführen (idempotent):
CREATE TABLE IF NOT EXISTS google_places_cache (
  place_id          TEXT PRIMARY KEY,
  rating            REAL,
  user_rating_count INTEGER,
  fetched_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
