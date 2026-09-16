// Feature switches. These live in the world-readable site_settings, not with
// the keys: a boolean saying whether a feature exists is not a secret, and the
// admin page needs it before it renders.
//
// The client keeps its own copy to decide whether to render a button, but a
// hidden button is not a switched-off feature — the endpoint is reachable
// directly by anyone with a session, so the server checks too.

import type { Db } from "./admin.ts";

export type AiFeature = "newsletter" | "seo" | "events" | "assistant";

export type AiFlags = { enabled: boolean } & Record<AiFeature, boolean>;

export const DEFAULT_FLAGS: AiFlags = {
  enabled: false, newsletter: true, seo: true, events: true, assistant: true,
};

export const AI_FLAGS_KEY = "ai_features_json";

export async function readFlags(db: Db): Promise<AiFlags> {
  const { data } = await db.from("site_settings").select("value").eq("key", AI_FLAGS_KEY).maybeSingle();
  return { ...DEFAULT_FLAGS, ...JSON.parse(data?.value ?? "{}") };
}

/**
 * Note this fails OPEN — the opposite of how the quota ceiling behaves, and
 * deliberate. A settings table briefly unreachable should not silently stop a
 * feature across the whole site. The master switch exists for stopping things
 * ON PURPOSE, and a flag a network blip could flip makes the two
 * indistinguishable.
 */
export async function aiFeatureOn(db: Db, feature: AiFeature): Promise<boolean> {
  try {
    const f = await readFlags(db);
    return f.enabled && !!f[feature];
  } catch {
    return true;
  }
}
