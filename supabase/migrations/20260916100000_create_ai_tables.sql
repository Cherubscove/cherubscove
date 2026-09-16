-- AI subsystem: provider chain, usage accounting, feature switches.
--
-- The guiding rule: no API key ever reaches the browser. Every model call
-- happens in an edge function holding the keys. ai_providers therefore has RLS
-- on with ZERO policies — not "admins can read". No browser session, including
-- an admin's, can read it. Admins manage it through an admin-gated edge
-- function that returns the key masked.

CREATE TABLE IF NOT EXISTS ai_providers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     text NOT NULL,                      -- which adapter handles it
  model        text NOT NULL DEFAULT '',           -- vendor's own model id, free text
  api_key      text,
  base_url     text,                               -- for OpenAI-compatible gateways
  enabled      boolean NOT NULL DEFAULT false,
  position     integer NOT NULL DEFAULT 0,         -- ascending; the chain order
  label        text,                               -- optional admin note
  daily_limit  integer,                            -- our own ceiling, NULL = uncapped
  last_used_at timestamptz,
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_providers_chain
  ON ai_providers (position) WHERE enabled;

ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies. Service role bypasses RLS; nothing else gets in.
REVOKE ALL ON ai_providers FROM anon, authenticated;

-- Per-provider, per-day call accounting. Failures count too: a vendor counts a
-- request it refused, so a counter ignoring failures runs ahead of the real
-- allowance in exactly the situation the ceiling exists to handle.
CREATE TABLE IF NOT EXISTS ai_model_usage (
  provider_id uuid NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  day         date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  calls       integer NOT NULL DEFAULT 0,
  failures    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (provider_id, day)
);

ALTER TABLE ai_model_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_model_usage FROM anon, authenticated;

-- Increment in ONE statement so two concurrent calls cannot both read the same
-- remaining allowance and both pass.
CREATE OR REPLACE FUNCTION ai_record_call(p_provider_id uuid, p_failed boolean)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO ai_model_usage (provider_id, day, calls, failures)
  VALUES (p_provider_id, (now() AT TIME ZONE 'utc')::date, 1, CASE WHEN p_failed THEN 1 ELSE 0 END)
  ON CONFLICT (provider_id, day) DO UPDATE
    SET calls    = ai_model_usage.calls + 1,
        failures = ai_model_usage.failures + CASE WHEN p_failed THEN 1 ELSE 0 END
  RETURNING calls;
$$;

REVOKE ALL ON FUNCTION ai_record_call(uuid, boolean) FROM anon, authenticated;

-- Cooldowns must survive between invocations, or a batch job running every few
-- minutes rediscovers the same refusals forever.
CREATE TABLE IF NOT EXISTS ai_engine_cooldowns (
  engine      text PRIMARY KEY,          -- provider_id::text
  until       timestamptz NOT NULL,
  window_kind text,                      -- 'day' | 'minute'
  detail      text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_engine_cooldowns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_engine_cooldowns FROM anon, authenticated;

-- Feature switches live in the world-readable settings, NOT with the keys. A
-- boolean saying whether a feature exists is not a secret, and the page needs
-- it before it renders.
INSERT INTO site_settings (key, label, value, type)
SELECT 'ai_features_json', 'AI Features (JSON)',
       '{"enabled":false,"newsletter":true,"seo":true,"events":true,"assistant":true}', 'text'
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'ai_features_json');
