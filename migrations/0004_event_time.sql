-- Add optional start time to events (HH:MM, 24h)
ALTER TABLE events ADD COLUMN IF NOT EXISTS time TEXT;
