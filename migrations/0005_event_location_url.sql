-- Add free-text location and optional event URL to events
-- Upgrade-Migration für bestehende DBs vor Schema-Version 0001 v2.
-- Frisch-Installs erhalten diese Spalten bereits über 0001_schema.sql.
ALTER TABLE events ADD COLUMN location TEXT;
ALTER TABLE events ADD COLUMN url TEXT;
