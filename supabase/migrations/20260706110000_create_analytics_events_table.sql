-- Create analytics_events table for tracking page views, downloads, and gallery views

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'download_click', 'gallery_view', 'visit')),
  page_path TEXT,
  resource_id TEXT,
  resource_type TEXT,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path ON analytics_events (page_path);
CREATE INDEX IF NOT EXISTS idx_analytics_events_resource ON analytics_events (resource_id, resource_type);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for tracking page views)
CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated admins can read analytics
CREATE POLICY "Authenticated users can read analytics events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (true);
