-- Ensure the registrations table has all required columns and proper RLS policies.
-- This allows public (unauthenticated) users to submit registrations while keeping
-- the data readable only by authenticated admins.

-- Create the table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS registrations (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_id   TEXT,
  event_title TEXT,
  first_name TEXT NOT NULL DEFAULT '',
  last_name  TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  program    TEXT NOT NULL DEFAULT '',
  location   TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  form_data  TEXT NOT NULL DEFAULT '{}'
);

-- Enable RLS (safe to run multiple times)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Anyone can register" ON registrations;
DROP POLICY IF EXISTS "Only authenticated users can view registrations" ON registrations;
DROP POLICY IF EXISTS "Authenticated users can delete registrations" ON registrations;

-- Policy: anyone (including anonymous visitors) can insert a registration
CREATE POLICY "Anyone can register"
  ON registrations FOR INSERT
  WITH CHECK (true);

-- Policy: only logged-in users can view registrations
CREATE POLICY "Only authenticated users can view registrations"
  ON registrations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: only authenticated users can delete registrations
CREATE POLICY "Authenticated users can delete registrations"
  ON registrations FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add the form_data column if it's missing (safe for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registrations' AND column_name = 'form_data'
  ) THEN
    ALTER TABLE registrations ADD COLUMN form_data TEXT NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Ensure phone column exists (might have been added after initial creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registrations' AND column_name = 'phone'
  ) THEN
    ALTER TABLE registrations ADD COLUMN phone TEXT NOT NULL DEFAULT '';
  END IF;
END $$;
