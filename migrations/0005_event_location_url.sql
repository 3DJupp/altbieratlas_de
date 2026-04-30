-- Add free-text location and optional event URL to events
-- Upgrade migration for existing DBs created before schema v2 (0001_schema.sql).
-- Fresh installs already include these columns via 0001_schema.sql.
ALTER TABLE events ADD COLUMN location TEXT;
ALTER TABLE events ADD COLUMN url TEXT;
