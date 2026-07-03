-- Add a completion_message column to the events table.
-- This allows admins to set a custom message (with HTML links)
-- shown to visitors after they successfully register for an event.
-- If left NULL/empty, the global default from site_settings is used.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS completion_message TEXT DEFAULT NULL;
