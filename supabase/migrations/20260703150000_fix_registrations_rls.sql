-- Ensure the registrations table has all required columns and proper RLS policies.
-- This allows public (unauthenticated) users to submit registrations while keeping
-- the data readable only by authenticated admins.

-- Create the table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS registrations (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_id   TEXT,
  full_name  TEXT,
  email      TEXT,
  phone      TEXT,
  program    TEXT NOT NULL DEFAULT '',
  state_city TEXT,
  prayer_note TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  attended   BOOLEAN NOT NULL DEFAULT false,
  form_data  JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Enable RLS (safe to run multiple times)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Add missing columns for older schemas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registrations' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE registrations ADD COLUMN full_name TEXT;
  ELSE
    ALTER TABLE registrations ALTER COLUMN full_name DROP NOT NULL;
    ALTER TABLE registrations ALTER COLUMN full_name DROP DEFAULT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registrations' AND column_name = 'state_city'
  ) THEN
    ALTER TABLE registrations ADD COLUMN state_city TEXT;
  ELSE
    ALTER TABLE registrations ALTER COLUMN state_city DROP NOT NULL;
    ALTER TABLE registrations ALTER COLUMN state_city DROP DEFAULT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registrations' AND column_name = 'prayer_note'
  ) THEN
    ALTER TABLE registrations ADD COLUMN prayer_note TEXT;
  ELSE
    ALTER TABLE registrations ALTER COLUMN prayer_note DROP NOT NULL;
    ALTER TABLE registrations ALTER COLUMN prayer_note DROP DEFAULT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registrations' AND column_name = 'form_data'
  ) THEN
    ALTER TABLE registrations ADD COLUMN form_data JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registrations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE registrations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

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

-- Ensure phone column exists (might have been added after initial creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registrations' AND column_name = 'email'
  ) THEN
    ALTER TABLE registrations ADD COLUMN email TEXT;
  ELSE
    ALTER TABLE registrations ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE registrations ALTER COLUMN email DROP DEFAULT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registrations' AND column_name = 'phone'
  ) THEN
    ALTER TABLE registrations ADD COLUMN phone TEXT;
  ELSE
    ALTER TABLE registrations ALTER COLUMN phone DROP NOT NULL;
    ALTER TABLE registrations ALTER COLUMN phone DROP DEFAULT;
  END IF;
END $$;
