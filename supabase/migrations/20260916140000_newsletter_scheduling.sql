-- Scheduled newsletter campaigns.
--
-- A campaign holds the message once and is drained in batches by a cron job,
-- so the admin picks the shape of the send and then stops thinking about it.
-- Recipients are not stored: the live subscriber list minus anyone already
-- sent this campaign is recomputed each pass, so somebody who unsubscribes
-- between batches is dropped rather than mailed.

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      text NOT NULL UNIQUE,
  subject          text NOT NULL,
  html             text NOT NULL,
  batch_size       integer NOT NULL DEFAULT 25 CHECK (batch_size BETWEEN 1 AND 500),
  interval_minutes integer NOT NULL DEFAULT 1440 CHECK (interval_minutes BETWEEN 5 AND 20160),
  next_run_at      timestamptz NOT NULL DEFAULT now(),
  status           text NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','paused','done','stopped')),
  sent_count       integer NOT NULL DEFAULT 0,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_run_at      timestamptz,
  last_error       text,
  -- Why a pass stopped, in words. "Did 25 and stopped because the batch was
  -- full" and "did 25 and stopped on an error" are the same row of numbers
  -- without it.
  last_reason      text
);

CREATE INDEX IF NOT EXISTS idx_campaigns_due
  ON newsletter_campaigns (next_run_at) WHERE status = 'scheduled';

ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
-- The message body is not secret, but nothing should reach it except through
-- the admin-gated function; the service role bypasses RLS.
REVOKE ALL ON newsletter_campaigns FROM anon, authenticated;
