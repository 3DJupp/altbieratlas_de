-- Add free-text location and optional event URL to events
ALTER TABLE events ADD COLUMN location TEXT;
ALTER TABLE events ADD COLUMN url TEXT;
