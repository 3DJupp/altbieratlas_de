-- Add optional start time to events (HH:MM, 24h)
-- Upgrade-Migration für bestehende DBs vor Schema-Version 0001 v2.
-- Frisch-Installs erhalten diese Spalten bereits über 0001_schema.sql.
ALTER TABLE events ADD COLUMN time TEXT;
