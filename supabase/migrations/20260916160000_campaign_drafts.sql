-- Campaigns survive the compose dialog.
--
-- A campaign was only written down when it was scheduled, so a draft lived in
-- React state and a refresh lost the campaign id — which is the thing that
-- makes "skip anyone already sent" work. Persist from the first send instead,
-- so any campaign can be reopened and continued later.
--
-- 'draft' is deliberately not a status the cron picks up: a saved campaign
-- sends only when a human presses Send or turns the schedule on.

ALTER TABLE newsletter_campaigns
  DROP CONSTRAINT IF EXISTS newsletter_campaigns_status_check;

ALTER TABLE newsletter_campaigns
  ADD CONSTRAINT newsletter_campaigns_status_check
  CHECK (status IN ('draft','scheduled','paused','done','stopped'));

ALTER TABLE newsletter_campaigns ALTER COLUMN status SET DEFAULT 'draft';

-- A draft that has never been sent has no batch cadence yet.
ALTER TABLE newsletter_campaigns ALTER COLUMN next_run_at DROP NOT NULL;
