-- Seed the chain in the order given, vendors interleaved so the attempt after
-- any refusal lands at a different company. All rows keyless and DISABLED:
-- a row cannot be enabled without both a key and a model.
-- Model ids rotate every few weeks; the "Models" button re-reads the live list.
INSERT INTO ai_providers (provider, model, position, enabled, label)
SELECT * FROM (VALUES
  ('groq',       'openai/gpt-oss-120b',                        0,  false, null),
  ('gemini',     'gemini-3-flash-preview',                     1,  false, null),
  ('openrouter', 'inclusionai/ling-3.0-flash-sante:free',      2,  false, 'free tier is account-wide'),
  ('groq',       'qwen/qwen3.8-27b',                           3,  false, null),
  ('gemini',     'gemini-3.1-flash-lite',                      4,  false, null),
  ('openrouter', 'nex-agi/nex-n2.5-pro:free',                  5,  false, null),
  ('groq',       'openai/gpt-oss-20b',                         6,  false, null),
  ('openrouter', 'nvidia/nemotron-3-ultra-550b-a55b:free',     7,  false, null),
  ('openrouter', 'nvidia/nemotron-3-super-120b-a12b:free',     8,  false, null),
  ('gemini',     'gemini-3.6-flash',                           9,  false, null),
  ('openrouter', 'inclusionai/ling-3.0-flash-fin:free',        10, false, null),
  ('nvidia',     'mistralai/mistral-nemotron',                 11, false, null),
  ('nvidia',     'deepseek-ai/deepseek-v4-flash-0731',         12, false, null)
) AS v(provider, model, position, enabled, label)
WHERE NOT EXISTS (SELECT 1 FROM ai_providers);
