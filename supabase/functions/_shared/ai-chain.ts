// The provider chain. Everything that needs a model calls runChain().
//
// It walks the enabled rows by `position` and returns the first usable answer.
// It NEVER throws: "the AI declined" is a normal outcome the caller handles by
// falling back to a template, not an error to show a user.

import { adapterFor } from "./ai-adapters.ts";

export type FailureKind =
  | "auth" | "quota" | "capped" | "rate" | "refusal"
  | "malformed" | "network" | "unconfigured";

export type Failure = {
  provider: string;
  model: string;
  kind: FailureKind;
  message: string;
  quotaWindow?: "minute" | "day";
  resetsAt?: string;
};

export type ChainResult = {
  text: string | null;
  provider?: string;
  model?: string;
  /** false = nothing is set up. Genuinely different from "everything refused". */
  configured: boolean;
  failures: Failure[];
};

export type ChainOpts = {
  /** Is this answer usable? An HTTP 200 carrying junk is a failure. */
  accept?: (raw: string) => boolean;
  system?: string;
  maxTokens?: number;
};

type ProviderRow = {
  id: string; provider: string; model: string; api_key: string | null;
  base_url: string | null; daily_limit: number | null; position: number;
};

/**
 * Classify a vendor error. A single last-error string cannot tell "all out of
 * quota" from "first is out, second has a bad key", and those need completely
 * different responses.
 */
export function classify(message: string, status?: number): Omit<Failure, "provider" | "model"> {
  const m = message.toLowerCase();

  if (status === 401 || status === 403 || /invalid api key|unauthorized|authentication|invalid_api_key/.test(m)) {
    return { kind: "auth", message };
  }

  if (status === 429 || /quota|rate limit|too many requests|resource_exhausted/.test(m)) {
    // Don't trust a vendor's suggested retryDelay: Google answers a DAILY quota
    // exhaustion with ~15s, which is a lie about when the allowance returns.
    // Decide from which quota was named.
    const daily = /per ?day|daily|perday|requests per day|quota_?id[^,]*day/i.test(message);
    if (daily) {
      const midnight = new Date();
      midnight.setUTCHours(24, 0, 0, 0);
      return { kind: "quota", message, quotaWindow: "day", resetsAt: midnight.toISOString() };
    }
    return {
      kind: "rate", message, quotaWindow: "minute",
      resetsAt: new Date(Date.now() + 60_000).toISOString(),
    };
  }

  if (/recitation|safety|blocked|content_filter|refus/.test(m)) return { kind: "refusal", message };
  if (/fetch failed|network|timeout|econn|socket/.test(m)) return { kind: "network", message };
  if (status && status >= 500) return { kind: "network", message };
  return { kind: "malformed", message };
}

/** Lift the field naming the quota to the front before anything truncates it. */
function summarise(raw: string): string {
  const quotaId = raw.match(/"quotaId"\s*:\s*"([^"]+)"/)?.[1];
  const head = quotaId ? `[quotaId=${quotaId}] ` : "";
  return (head + raw).slice(0, 900);
}

export async function runChain(
  db: any,
  prompt: string,
  opts: ChainOpts = {},
): Promise<ChainResult> {
  const accept = opts.accept ?? ((raw: string) => !!raw.trim());
  const failures: Failure[] = [];

  const { data: rows, error } = await db
    .from("ai_providers")
    .select("id, provider, model, api_key, base_url, daily_limit, position")
    .eq("enabled", true)
    .order("position", { ascending: true });

  if (error) {
    return {
      text: null, configured: false,
      failures: [{ provider: "-", model: "-", kind: "unconfigured", message: error.message }],
    };
  }

  const usable = (rows ?? []).filter((r: ProviderRow) => r.api_key && r.model);
  if (!usable.length) return { text: null, configured: false, failures: [] };

  // Read the whole day's counts ONCE per run, not per row: the common case is
  // that nothing is capped, and a query per provider spends a round trip each
  // to learn that.
  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRows } = await db
    .from("ai_model_usage").select("provider_id, calls").eq("day", today);
  const used = new Map<string, number>(
    (usageRows ?? []).map((u: { provider_id: string; calls: number }) => [u.provider_id, u.calls]),
  );

  const { data: coolRows } = await db
    .from("ai_engine_cooldowns").select("engine, until, window_kind, detail")
    .gt("until", new Date().toISOString());
  const cooling = new Map<string, { until: string; window_kind: string | null; detail: string | null }>(
    (coolRows ?? []).map((c: any) => [c.engine, c]),
  );

  for (const row of usable as ProviderRow[]) {
    const tag = { provider: row.provider, model: row.model };

    // A provider that silently vanishes from the chain is the hardest thing
    // here to debug, so every skip is pushed into failures too.
    const cool = cooling.get(row.id);
    if (cool) {
      failures.push({
        ...tag, kind: cool.window_kind === "day" ? "quota" : "rate",
        message: `Resting until ${cool.until}${cool.detail ? ` — ${cool.detail}` : ""}`,
        quotaWindow: cool.window_kind === "day" ? "day" : "minute",
        resetsAt: cool.until,
      });
      continue;
    }

    if (row.daily_limit != null && (used.get(row.id) ?? 0) >= row.daily_limit) {
      failures.push({
        ...tag, kind: "capped",
        message: `Reached our own daily ceiling of ${row.daily_limit}`,
        quotaWindow: "day",
      });
      continue;
    }

    const found = adapterFor(row.provider);
    if (!found) {
      failures.push({ ...tag, kind: "unconfigured", message: `No adapter for "${row.provider}"` });
      continue;
    }

    let raw = "";
    let failure: Omit<Failure, "provider" | "model"> | null = null;
    try {
      raw = await found.adapter({
        apiKey: row.api_key!, model: row.model, prompt,
        system: opts.system, maxTokens: opts.maxTokens,
        baseUrl: row.base_url || found.baseUrl,
      });
      // An HTTP 200 carrying junk is that provider failing, not a success.
      if (!accept(raw)) failure = { kind: "malformed", message: "Answer did not survive validation" };
    } catch (err) {
      const message = summarise(err instanceof Error ? err.message : String(err));
      const status = Number(message.match(/HTTP (\d{3})/)?.[1]) || undefined;
      failure = classify(message, status);
    }

    // Both outcomes increment the counter: vendors count a request they refused.
    await db.rpc("ai_record_call", { p_provider_id: row.id, p_failed: !!failure }).then(
      () => {}, (e: unknown) => console.error("ai_record_call failed:", e),
    );

    if (!failure) {
      await db.from("ai_providers")
        .update({ last_used_at: new Date().toISOString(), last_error: null })
        .eq("id", row.id);
      return { text: raw, ...tag, configured: true, failures };
    }

    failures.push({ ...tag, ...failure });
    await db.from("ai_providers").update({ last_error: failure.message.slice(0, 900) }).eq("id", row.id);

    // Persist the cooldown, sized from the KIND of limit, so a later
    // invocation does not rediscover the same refusal.
    if (failure.resetsAt && (failure.kind === "quota" || failure.kind === "rate")) {
      await db.from("ai_engine_cooldowns").upsert({
        engine: row.id,
        until: failure.resetsAt,
        window_kind: failure.quotaWindow ?? null,
        detail: failure.message.slice(0, 300),
        updated_at: new Date().toISOString(),
      });
    }
  }

  return { text: null, configured: true, failures };
}
