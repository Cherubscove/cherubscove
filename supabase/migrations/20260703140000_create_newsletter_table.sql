-- Create a newsletter subscription table for storing subscriber emails.
-- Emails must be unique to prevent duplicates.

CREATE TABLE IF NOT EXISTS newsletter (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email   TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable row-level security so only authenticated users (admins) can read,
-- but anyone can insert (public sign-up).
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON newsletter FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can view subscribers"
  ON newsletter FOR SELECT
  USING (auth.role() = 'authenticated');

-- Index for quick duplicate checks
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter (email);
