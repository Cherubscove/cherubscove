-- Ensure the downloads table has all columns expected by the frontend

CREATE TABLE IF NOT EXISTS downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloads' AND column_name = 'title') THEN
    ALTER TABLE downloads ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloads' AND column_name = 'url') THEN
    ALTER TABLE downloads ADD COLUMN url TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloads' AND column_name = 'description') THEN
    ALTER TABLE downloads ADD COLUMN description TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloads' AND column_name = 'category') THEN
    ALTER TABLE downloads ADD COLUMN category TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloads' AND column_name = 'type') THEN
    ALTER TABLE downloads ADD COLUMN type TEXT DEFAULT '';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view downloads
DROP POLICY IF EXISTS "Anyone can view downloads" ON downloads;
CREATE POLICY "Anyone can view downloads"
  ON downloads FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can manage downloads
DROP POLICY IF EXISTS "Authenticated users can manage downloads" ON downloads;
CREATE POLICY "Authenticated users can manage downloads"
  ON downloads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
