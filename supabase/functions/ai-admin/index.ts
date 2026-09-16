// Supabase Edge Function: ai-admin
//
// The only way an admin touches the provider chain. ai_providers has RLS on
// with no policies, so no browser session can read it — keys come back MASKED
// here, never in full.
//
// Actions: list | upsert | delete | reorder | models | flags | set_flags | test

import { CORS, json, requireAdmin, serviceClient } from "../_shared/admin.ts";
import { ALL_PROVIDERS, adapterFor, modelsUrlFor, OPENAI_COMPATIBLE } from "../_shared/ai-adapters.ts";
import { AI_FLAGS_KEY, DEFAULT_FLAGS, readFlags } from "../_shared/ai-flags.ts";

type AdminRequest = {
  action?: string;
  id?: string;
  order?: string[];
  provider?: Partial<ProviderPatch> & { id?: string; api_key?: string };
  flags?: Record<string, boolean>;
  // Used by "models" when checking a key before it has been saved.
  api_key?: string;
  base_url?: string;
};

type ProviderPatch = {
  provider: string; model: string; base_url: string | null; label: string | null;
  position: number; daily_limit: number | null; enabled: boolean; api_key?: string;
};

type UsageRow = { provider_id: string; calls: number; failures: number };
type CooldownRow = { engine: string; until: string; window_kind: string | null; detail: string | null };
type ListedProvider = {
  id: string; api_key: string | null; [k: string]: unknown;
};

function mask(key: string | null): string | null {
  if (!key) return null;
  return key.length <= 8 ? "…" : `${key.slice(0, 3)}…${key.slice(-4)}`;
}

/** Fetch the vendor's real model list. Free-tier model ids rotate constantly;
 *  a typed model name is a support ticket and a guessed one is worse. */
async function listModels(provider: string, apiKey: string, baseUrl?: string): Promise<string[]> {
  const url = modelsUrlFor(provider, baseUrl);
  if (!url) throw new Error(`No model list endpoint for "${provider}"`);

  const headers: Record<string, string> = provider === "gemini"
    ? { "x-goog-api-key": apiKey }
    : provider === "anthropic"
    ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
    : { "Authorization": `Bearer ${apiKey}` };

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();

  const raw: string[] = provider === "gemini"
    ? (body?.models ?? []).map((m: { name?: string }) => (m.name ?? "").replace(/^models\//, ""))
    : (body?.data ?? body?.models ?? []).map((m: { id?: string; name?: string }) => m.id ?? m.name ?? "");

  return Array.from(new Set(raw.filter(Boolean))).sort();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  let body: AdminRequest;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const action = String(body.action || "");
  const db = serviceClient();

  try {
    switch (action) {
      case "list": {
        const today = new Date().toISOString().slice(0, 10);
        const [{ data: rows }, { data: usage }, { data: cooldowns }] = await Promise.all([
          db.from("ai_providers").select("*").order("position", { ascending: true }),
          db.from("ai_model_usage").select("provider_id, calls, failures").eq("day", today),
          db.from("ai_engine_cooldowns").select("*").gt("until", new Date().toISOString()),
        ]);
        const used = new Map((usage ?? []).map((u: UsageRow) => [u.provider_id, u]));
        const cool = new Map((cooldowns ?? []).map((c: CooldownRow) => [c.engine, c]));
        return json(200, {
          providers: (rows ?? []).map((r: ListedProvider) => ({
            ...r,
            api_key: mask(r.api_key),
            has_key: !!r.api_key,
            calls_today: used.get(r.id)?.calls ?? 0,
            failures_today: used.get(r.id)?.failures ?? 0,
            cooldown: cool.get(r.id) ?? null,
          })),
          known_providers: ALL_PROVIDERS,
          openai_compatible: Object.keys(OPENAI_COMPATIBLE),
        });
      }

      case "upsert": {
        const p = body.provider ?? ({} as NonNullable<AdminRequest["provider"]>);
        if (!p.provider) return json(400, { error: "provider is required" });
        // Refuse to enable a row without both a key and a model — that is the
        // one state that produces a silent, puzzling chain.
        const patch: Record<string, unknown> = {
          provider: p.provider,
          model: p.model ?? "",
          base_url: p.base_url || null,
          label: p.label || null,
          position: Number(p.position ?? 0),
          daily_limit: p.daily_limit === "" || p.daily_limit == null ? null : Number(p.daily_limit),
          enabled: !!p.enabled,
        };
        // Only overwrite the key when a new one is actually supplied — the UI
        // only ever holds the masked form.
        if (typeof p.api_key === "string" && p.api_key.trim() && !p.api_key.includes("…")) {
          patch.api_key = p.api_key.trim();
        }

        if (p.id) {
          if (patch.enabled) {
            const { data: existing } = await db.from("ai_providers").select("api_key").eq("id", p.id).maybeSingle();
            const key = (patch.api_key as string) ?? existing?.api_key;
            if (!key || !patch.model) return json(400, { error: "A row needs both a key and a model before it can be enabled." });
          }
          const { error } = await db.from("ai_providers").update(patch).eq("id", p.id);
          if (error) throw error;
          return json(200, { ok: true, id: p.id });
        }

        if (patch.enabled && (!patch.api_key || !patch.model)) {
          return json(400, { error: "A row needs both a key and a model before it can be enabled." });
        }
        // Seed a new gateway row with a blank model, disabled: a guessed seed
        // value gives the admin two things to fix instead of one.
        const { data, error } = await db.from("ai_providers").insert(patch).select("id").single();
        if (error) throw error;
        return json(200, { ok: true, id: data.id });
      }

      case "delete": {
        if (!body.id) return json(400, { error: "id is required" });
        const { error } = await db.from("ai_providers").delete().eq("id", body.id);
        if (error) throw error;
        return json(200, { ok: true });
      }

      case "reorder": {
        const order: string[] = body.order ?? [];
        for (let i = 0; i < order.length; i++) {
          await db.from("ai_providers").update({ position: i }).eq("id", order[i]);
        }
        return json(200, { ok: true });
      }

      case "models": {
        const id = body.id;
        let { provider, api_key, base_url } = body as
          { provider?: string; api_key?: string; base_url?: string | null };
        if (id) {
          const { data } = await db.from("ai_providers").select("provider, api_key, base_url").eq("id", id).maybeSingle();
          provider = data?.provider; api_key = data?.api_key; base_url = data?.base_url;
        }
        if (!provider || !api_key) return json(400, { error: "Save a key first, then pick a model." });
        return json(200, { models: await listModels(provider, api_key, base_url || undefined) });
      }

      case "test": {
        const { data: row } = await db.from("ai_providers")
          .select("provider, model, api_key, base_url").eq("id", body.id).maybeSingle();
        if (!row?.api_key || !row.model) return json(400, { error: "This row needs a key and a model first." });
        const found = adapterFor(row.provider);
        if (!found) return json(400, { error: `No adapter for "${row.provider}"` });
        try {
          const text = await found.adapter({
            apiKey: row.api_key, model: row.model, prompt: "Reply with the single word: ready",
            // Not 16: a reasoning model spends its whole budget thinking and
            // returns an empty answer, so a tight cap fails every good row.
            baseUrl: row.base_url || found.baseUrl, maxTokens: 512,
          });
          const ok = !!text.trim();
          await db.from("ai_providers")
            .update(ok ? { last_used_at: new Date().toISOString(), last_error: null } : {})
            .eq("id", body.id);
          return json(200, { ok, reply: text.trim().slice(0, 120) });
        } catch (err) {
          const message = (err instanceof Error ? err.message : String(err)).slice(0, 600);
          await db.from("ai_providers").update({ last_error: message }).eq("id", body.id);
          return json(200, { ok: false, error: message });
        }
      }

      case "flags":
        return json(200, { flags: await readFlags(db) });

      case "set_flags": {
        const next = { ...DEFAULT_FLAGS, ...(body.flags ?? {}) };
        const { data: row } = await db.from("site_settings").select("id").eq("key", AI_FLAGS_KEY).maybeSingle();
        const value = JSON.stringify(next);
        const { error } = row
          ? await db.from("site_settings").update({ value }).eq("id", row.id)
          : await db.from("site_settings").insert({ key: AI_FLAGS_KEY, label: "AI Features (JSON)", value, type: "text" });
        if (error) throw error;
        return json(200, { ok: true, flags: next });
      }

      default:
        return json(400, { error: `Unknown action "${action}"` });
    }
  } catch (err) {
    console.error("ai-admin error:", err);
    return json(500, { error: err instanceof Error ? err.message : String(err) });
  }
});
