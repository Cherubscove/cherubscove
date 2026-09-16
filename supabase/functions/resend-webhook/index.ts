// Supabase Edge Function: resend-webhook
//
// Receives delivery events from Resend (verify_jwt = false — Resend has no
// Supabase session; authenticity comes from the Svix signature instead).
//
// Why this matters more than it looks: a hard bounce or a spam complaint that
// nobody acts on is repeat damage. Mailing a dead address a second time is a
// stronger negative signal than the first, and continuing to mail somebody who
// pressed "report spam" is the single fastest way to poison a sending domain.
// So both are unsubscribed automatically, here, without an admin in the loop.
//
// Set RESEND_WEBHOOK_SECRET to the signing secret Resend shows when the
// endpoint is created (it looks like "whsec_...").

import { serviceClient } from "../_shared/admin.ts";

const SIGNING_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

/** Svix signature scheme: HMAC-SHA256 over "<id>.<timestamp>.<body>". */
async function verify(req: Request, raw: string): Promise<boolean> {
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const sigHeader = req.headers.get("svix-signature");
  if (!id || !ts || !sigHeader || !SIGNING_SECRET) return false;

  // Reject anything older than five minutes so a captured request cannot be
  // replayed later.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  const secret = SIGNING_SECRET.startsWith("whsec_") ? SIGNING_SECRET.slice(6) : SIGNING_SECRET;
  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(secret), c => c.charCodeAt(0)),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${raw}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // The header carries a space-separated list of "v1,<sig>" candidates.
  return sigHeader.split(" ").some(part => {
    const sig = part.split(",")[1] ?? "";
    if (sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

type ResendEvent = {
  type?: string;
  data?: { to?: string[]; email?: string; bounce?: { type?: string }; subject?: string };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!SIGNING_SECRET) return new Response("Webhook secret not configured", { status: 500 });

  const raw = await req.text();
  if (!await verify(req, raw)) return new Response("Invalid signature", { status: 401 });

  let event: ResendEvent;
  try { event = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }

  const type = event.type ?? "";
  const recipient = (event.data?.to?.[0] ?? event.data?.email ?? "").trim().toLowerCase();
  if (!recipient) return new Response("ok", { status: 200 });

  const db = serviceClient();

  // A soft bounce is a full mailbox or a temporary refusal — the address is
  // still real, so removing the person would be wrong.
  const hardBounce = type === "email.bounced" && event.data?.bounce?.type?.toLowerCase() !== "transient";
  const complaint = type === "email.complained";

  if (hardBounce || complaint) {
    await db.from("newsletter")
      .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() })
      .eq("email", recipient);
  }

  const status = complaint ? "bounced" : type === "email.bounced" ? "bounced" : null;
  if (status) {
    await db.from("newsletter_send_log").insert({
      campaign_id: `webhook-${new Date().toISOString().slice(0, 10)}`,
      recipient_email: recipient,
      subject: event.data?.subject ?? type,
      status,
      error_message: complaint
        ? "Recipient marked the email as spam — removed from the list"
        : `Bounced (${event.data?.bounce?.type ?? "unknown"})${hardBounce ? " — removed from the list" : ""}`,
    });
  }

  return new Response("ok", { status: 200 });
});
