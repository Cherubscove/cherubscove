-- Applied to the live database on 2026-09-22.
-- Give the downloads page what it needs to sort by recency and popularity.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloads' AND column_name = 'download_count') THEN
    ALTER TABLE downloads ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloads' AND column_name = 'created_at') THEN
    ALTER TABLE downloads ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_download_count ON downloads (download_count DESC);

-- Visitors are anonymous, so they cannot UPDATE the row themselves; this
-- definer function lets them bump only the counter, nothing else.
CREATE OR REPLACE FUNCTION increment_download_count(download_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE downloads
     SET download_count = COALESCE(download_count, 0) + 1
   WHERE id = download_id
  RETURNING download_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION increment_download_count(UUID) TO anon, authenticated;
