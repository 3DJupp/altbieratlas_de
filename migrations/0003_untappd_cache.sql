-- ============================================================
-- Altbieratlas — Migration 0003: Untappd-Cache
-- ============================================================
-- Speichert gecachte Untappd-Daten pro Atlas-Brauerei (24h TTL).
-- Einzuspielen mit:
--   npx wrangler d1 execute altbieratlas --remote --file=migrations/0003_untappd_cache.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS untappd_cache (
  atlas_id  TEXT PRIMARY KEY,   -- ID der Brauerei im Atlas
  data      TEXT NOT NULL,       -- JSON: { found, untappdId, name, rating, beerCount, ... }
  cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);
