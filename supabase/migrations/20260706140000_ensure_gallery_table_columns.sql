-- Ensure the gallery table has all columns expected by the frontend

-- First ensure the table exists
CREATE TABLE IF NOT EXISTS gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gallery' AND column_name = 'title') THEN
    ALTER TABLE gallery ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gallery' AND column_name = 'image_url') THEN
    ALTER TABLE gallery ADD COLUMN image_url TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gallery' AND column_name = 'caption') THEN
    ALTER TABLE gallery ADD COLUMN caption TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gallery' AND column_name = 'category') THEN
    ALTER TABLE gallery ADD COLUMN category TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gallery' AND column_name = 'alt_text') THEN
    ALTER TABLE gallery ADD COLUMN alt_text TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gallery' AND column_name = 'featured') THEN
    ALTER TABLE gallery ADD COLUMN featured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view gallery images
DROP POLICY IF EXISTS "Anyone can view gallery" ON gallery;
CREATE POLICY "Anyone can view gallery"
  ON gallery FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can manage gallery images
DROP POLICY IF EXISTS "Authenticated users can manage gallery" ON gallery;
CREATE POLICY "Authenticated users can manage gallery"
  ON gallery FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
