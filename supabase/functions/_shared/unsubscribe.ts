// One-click unsubscribe tokens.
//
// The token is an HMAC of the lowercased email keyed by the service role key, so
// no extra secret is needed and a recipient cannot unsubscribe anybody but
// themselves by editing the link.

const enc = new TextEncoder();

async function key() {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
}

export async function unsubscribeToken(email: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(email.toLowerCase().trim()));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function verifyUnsubscribeToken(email: string, token: string): Promise<boolean> {
  const expected = await unsubscribeToken(email);
  if (expected.length !== token.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

/** The public URL a recipient clicks to unsubscribe. */
export async function unsubscribeUrl(email: string): Promise<string> {
  const base = Deno.env.get("SUPABASE_URL") ?? "";
  const t = await unsubscribeToken(email);
  return `${base}/functions/v1/newsletter-unsubscribe?e=${encodeURIComponent(email.toLowerCase().trim())}&t=${t}`;
}
