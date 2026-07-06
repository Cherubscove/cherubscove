-- Add delivery tracking and unsubscribe columns to the newsletter table
-- Also create a newsletter_send_log table for per-email delivery status and audit trail

-- ── 1. Add columns to newsletter table ──────────────────────────────────

ALTER TABLE newsletter
  ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT NULL;

-- ── 2. Create newsletter_send_log table ─────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_send_log (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id     TEXT NOT NULL DEFAULT '',
  recipient_email TEXT NOT NULL,
  subject         TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message   TEXT DEFAULT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by campaign and email
CREATE INDEX IF NOT EXISTS idx_nl_send_log_campaign ON newsletter_send_log (campaign_id);
CREATE INDEX IF NOT EXISTS idx_nl_send_log_recipient ON newsletter_send_log (recipient_email);
CREATE INDEX IF NOT EXISTS idx_nl_send_log_sent_at ON newsletter_send_log (sent_at DESC);

-- Enable RLS
ALTER TABLE newsletter_send_log ENABLE ROW LEVEL SECURITY;

-- Create policies (table exists now, so DROP IF EXISTS is safe)
DROP POLICY IF EXISTS "Only authenticated users can view send logs" ON newsletter_send_log;
CREATE POLICY "Only authenticated users can view send logs"
  ON newsletter_send_log FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert send logs" ON newsletter_send_log;
CREATE POLICY "Authenticated users can insert send logs"
  ON newsletter_send_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
