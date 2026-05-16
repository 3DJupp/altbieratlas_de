-- ============================================================
-- Altbieratlas — Upgrade: Style-Logos + is_producer (v0.8.0)
-- ============================================================
-- Für bestehende Installationen: einmalig in der D1-Console ausführen.
-- Danach kann diese Datei gelöscht werden (in 0001_schema.sql integriert).
-- ============================================================

ALTER TABLE venue_types ADD COLUMN is_producer INTEGER NOT NULL DEFAULT 0;
UPDATE venue_types SET is_producer = 1 WHERE id IN ('brewery', 'brewpub', 'hausbrauerei');
ALTER TABLE styles ADD COLUMN logo_key TEXT;
