-- ============================================================
-- Altbieratlas — Migration 0004
-- Mehrtägige Events + Event-Biere
-- ============================================================
-- Für bestehende Installationen nach 0001–0003 anwenden.
-- HINWEIS: D1 unterstützt kein ALTER TABLE ADD COLUMN IF NOT EXISTS.
-- Vor Ausführung prüfen, ob end_date/end_time bereits existieren
-- (z. B. via PRAGMA table_info(events)); ggf. nur CREATE TABLE/INDEX.
-- ============================================================

-- Enddatum + Endzeit für mehrtägige Events
ALTER TABLE events ADD COLUMN end_date TEXT;
ALTER TABLE events ADD COLUMN end_time TEXT;

-- Event-Biere (werden vom Preis-Ranking ausgenommen)
CREATE TABLE IF NOT EXISTS event_beers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   TEXT    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name_de    TEXT,
  name_en    TEXT,
  size       TEXT    NOT NULL,
  price      REAL,
  notes      TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_event_beers_event ON event_beers(event_id);
