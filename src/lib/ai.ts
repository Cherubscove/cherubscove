/**
 * Client helpers for the AI subsystem.
 *
 * No key ever reaches here — the browser only ever calls our own edge
 * functions, which hold the keys. `ai_providers` has RLS on with no policies,
 * so even an admin's session cannot read that table directly.
 */
import { supabase } from '@/lib/supabaseClient';

export type AiFeature = 'newsletter' | 'seo' | 'events' | 'assistant';
export type AiFlags = { enabled: boolean } & Record<AiFeature, boolean>;

export const DEFAULT_AI_FLAGS: AiFlags = {
  enabled: false, newsletter: true, seo: true, events: true, assistant: true,
};

export type AiFailure = {
  provider: string;
  model: string;
  kind: 'auth' | 'quota' | 'capped' | 'rate' | 'refusal' | 'malformed' | 'network' | 'unconfigured';
  message: string;
  quotaWindow?: 'minute' | 'day';
  resetsAt?: string;
};

export type AiProviderRow = {
  id: string;
  provider: string;
  model: string;
  api_key: string | null;   // masked, e.g. "sk-…abcd"
  has_key: boolean;
  base_url: string | null;
  label: string | null;
  enabled: boolean;
  position: number;
  daily_limit: number | null;
  last_used_at: string | null;
  last_error: string | null;
  calls_today: number;
  failures_today: number;
  cooldown: { until: string; window_kind: string | null; detail: string | null } | null;
};

export type AiResult = {
  text: string | null;
  result: Record<string, string> | null;
  configured: boolean;
  provider?: string | null;
  model?: string | null;
  failures: AiFailure[];
};

async function invoke<T>(fn: 'ai-admin' | 'ai-generate', body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // The function returns a JSON body with `error` on 4xx; surface that rather
    // than the opaque "Edge Function returned a non-2xx status code".
    const detail = (error as { context?: { body?: string } })?.context?.body;
    let message = error.message;
    try { message = JSON.parse(detail ?? '')?.error ?? message; } catch { /* keep */ }
    throw new Error(message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const aiAdmin = {
  list: () => invoke<{ providers: AiProviderRow[]; known_providers: string[]; openai_compatible: string[] }>(
    'ai-admin', { action: 'list' }),
  upsert: (provider: Partial<AiProviderRow> & { api_key?: string }) =>
    invoke<{ ok: true; id: string }>('ai-admin', { action: 'upsert', provider }),
  remove: (id: string) => invoke<{ ok: true }>('ai-admin', { action: 'delete', id }),
  reorder: (order: string[]) => invoke<{ ok: true }>('ai-admin', { action: 'reorder', order }),
  models: (id: string) => invoke<{ models: string[] }>('ai-admin', { action: 'models', id }),
  test: (id: string) => invoke<{ ok: boolean; reply?: string; error?: string }>('ai-admin', { action: 'test', id }),
  flags: () => invoke<{ flags: AiFlags }>('ai-admin', { action: 'flags' }),
  setFlags: (flags: AiFlags) => invoke<{ ok: true; flags: AiFlags }>('ai-admin', { action: 'set_flags', flags }),
};

export type AiTask = 'newsletter' | 'seo' | 'event' | 'rewrite';

export const aiGenerate = (task: AiTask, input: Record<string, string>) =>
  invoke<AiResult>('ai-generate', { task, input });

/**
 * Turn a chain outcome into one sentence an admin can act on. A vendor's 429
 * body is 300 characters of billing advice and reads as something broken.
 * Usually nothing is broken — say so.
 */
export function explainFailure(res: AiResult): string {
  if (!res.configured) {
    return 'No AI model is set up yet. Add one under Settings → AI.';
  }
  const f = res.failures;
  if (!f.length) return 'The AI returned nothing usable.';

  if (f.every(x => x.kind === 'quota' || x.kind === 'capped' || x.kind === 'rate')) {
    const soonest = f.map(x => x.resetsAt).filter(Boolean).sort()[0];
    const when = soonest
      ? new Date(soonest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;
    return `Every model has used up its allowance for now${when ? `; the first comes back around ${when}` : ''}. Nothing is lost and nothing needs doing.`;
  }
  if (f.some(x => x.kind === 'auth')) {
    const bad = f.filter(x => x.kind === 'auth').map(x => x.provider).join(', ');
    return `A key was rejected (${bad}). Check it under Settings → AI.`;
  }
  return `Tried ${f.length} model${f.length === 1 ? '' : 's'}, none gave a usable answer. Last: ${f[f.length - 1].message.slice(0, 120)}`;
}

/** Read the feature switches from the world-readable settings row. */
export async function readAiFlagsPublic(settingsRows: { key: string; value: string }[]): Promise<AiFlags> {
  const row = settingsRows.find(r => r.key === 'ai_features_json');
  try { return { ...DEFAULT_AI_FLAGS, ...JSON.parse(row?.value ?? '{}') }; }
  catch { return DEFAULT_AI_FLAGS; }
}

/* ── Newsletter campaign scheduling ──────────────────────────────────── */

export type Campaign = {
  id: string;
  campaign_id: string;
  subject: string;
  html: string;
  /** Counted from the send log, not trusted from the campaign row. */
  sent_actual: number;
  bounced: number;
  audience: number;
  remaining: number;
  batch_size: number;
  interval_minutes: number;
  next_run_at: string;
  status: 'draft' | 'scheduled' | 'paused' | 'done' | 'stopped';
  sent_count: number;
  last_run_at: string | null;
  last_reason: string | null;
  last_error: string | null;
  created_at: string;
};

async function dispatch<T>(body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('newsletter-dispatch', { body });
  if (error) {
    const detail = (error as { context?: { body?: string } })?.context?.body;
    let message = error.message;
    try { message = JSON.parse(detail ?? '')?.error ?? message; } catch { /* keep */ }
    throw new Error(message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const campaigns = {
  list: () => dispatch<{ campaigns: Campaign[] }>({ action: 'list' }),
  schedule: (c: {
    campaign_id: string; subject: string; html: string;
    batch_size: number; interval_minutes: number; start_at?: string; created_by?: string;
  }) => dispatch<{ ok: true; id: string }>({ action: 'schedule', ...c }),
  setStatus: (id: string, status: 'scheduled' | 'paused' | 'stopped') =>
    dispatch<{ ok: true }>({ action: 'set_status', id, status }),
  /** Persist a draft so it survives a refresh and can be continued later. */
  save: (c: { campaign_id: string; subject: string; html: string; batch_size: number; created_by?: string }) =>
    dispatch<{ ok: true }>({ action: 'save', ...c }),
  remove: (id: string) => dispatch<{ ok: true }>({ action: 'delete', id }),
  runNow: () => dispatch<{ ran: number }>({}),
};

/** Human wording for a batch cadence. */
export const INTERVAL_CHOICES: { label: string; minutes: number }[] = [
  { label: 'every 15 minutes', minutes: 15 },
  { label: 'every hour', minutes: 60 },
  { label: 'every 3 hours', minutes: 180 },
  { label: 'every 6 hours', minutes: 360 },
  { label: 'once a day', minutes: 1440 },
];
