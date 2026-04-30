-- Add optional start time to events (HH:MM, 24h format)
-- Upgrade migration for existing DBs created before schema v2 (0001_schema.sql).
-- Fresh installs already include this column via 0001_schema.sql.
ALTER TABLE events ADD COLUMN time TEXT;
