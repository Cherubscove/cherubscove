// Supabase Edge Function: send-newsletter-email
//
// Sends a newsletter to one or many recipients via Resend's batch endpoint —
// one individual email per recipient, not a BCC blast, so each carries its own
// unsubscribe link and each gets a real delivery result in newsletter_send_log.
//
// Environment:
//   RESEND_API_KEY              — Resend API key
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-injected by the runtime
//
// Auth: admin only. The caller's JWT must belong to an email on the admin
// roster (site_settings.admin_users_json) or the super admin.

import { CORS, json, requireAdmin, serviceClient } from "../_shared/admin.ts";
import { unsubscribeUrl } from "../_shared/unsubscribe.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_ADDRESS = "Cherubs Cove Ministry <noreply@cherubscove.net>";
// A no-reply From with nowhere to reply to is a mild spam signal and a rude one.
// ADMIN_NOTIFY_EMAIL already exists as a project secret; reuse it.
const REPLY_TO = Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "";
const BATCH_SIZE = 100; // Resend's per-call limit for /emails/batch
// Shared with the scheduler, so "Send now" in the console and the cron pass are
// the same code path.
const DISPATCH_SECRET = Deno.env.get("NEWSLETTER_DISPATCH_SECRET") ?? "";
// Above this, a campaign is doing more harm than good: every further message
// deepens the damage to the domain's reputation.
const BOUNCE_LIMIT = 0.05;
const BOUNCE_MIN_SAMPLE = 20;

/**
 * Has this campaign started going wrong? Manual sending does not protect you
 * if nobody reads the log, so the send itself refuses.
 */
async function bounceRate(db: ReturnType<typeof serviceClient>, campaignId: string) {
  const { data } = await db
    .from("newsletter_send_log")
    .select("status")
    .eq("campaign_id", campaignId);
  const rows = data ?? [];
  const delivered = rows.filter((r: { status: string }) => r.status === "sent").length;
  const bad = rows.filter((r: { status: string }) => r.status === "bounced").length;
  const sample = delivered + bad;
  return { sample, bad, rate: sample ? bad / sample : 0 };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Identity shown in every newsletter, read from site_settings so an admin can
 * change it without a deploy.
 *
 * The postal address is not decoration: CAN-SPAM (and its equivalents) require
 * a real physical address in commercial mail, and filters treat its absence as
 * a mark against you. A signed-off message from a named human also reads as
 * correspondence rather than a broadcast, which is what you want.
 */
type Identity = { address: string; signature: string };

async function readIdentity(db: ReturnType<typeof serviceClient>): Promise<Identity> {
  const { data } = await db
    .from("site_settings")
    .select("key, value")
    .in("key", ["newsletter_postal_address", "newsletter_signature"]);
  const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  return {
    address: (map.get("newsletter_postal_address") ?? "").trim(),
    signature: (map.get("newsletter_signature") ?? "").trim(),
  };
}

function wrapHtml(subject: string, bodyHtml: string, unsubUrl: string, id: Identity): string {
  const signature = id.signature
    ? `<p style="margin:24px 0 0;color:#374151">${escapeHtml(id.signature).replace(/\n/g, "<br/>")}</p>`
    : "";
  const address = id.address
    ? `<br/><span style="color:#b6ada1">${escapeHtml(id.address).replace(/\n/g, ", ")}</span>`
    : "";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px">
  <table cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr><td style="padding:28px 32px 18px;background:linear-gradient(135deg,#1e1b1a,#3a2a22)">
      <h1 style="margin:0;font-size:20px;color:#ffffff;font-weight:600">Cherubs Cove Ministry</h1>
    </td></tr>
    <tr><td style="padding:28px 32px;color:#374151;font-size:15px;line-height:1.7">
      ${bodyHtml}
      ${signature}
    </td></tr>
    <tr><td style="padding:16px 32px 28px;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6">
      You're receiving this because you subscribed to updates from Cherubs Cove Ministry.${address}<br/>
      <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
    </td></tr>
  </table>
</body></html>`;
}

type Outcome = { email: string; status: "sent" | "failed"; error?: string };

/**
 * A plain-text alternative. An HTML-only message is one of the oldest spam
 * signals there is — every legitimate bulk sender ships both parts.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<li[^>]*>/gi, "\n  • ")
    .replace(/<\/(p|div|h[1-6]|tr|ul|ol)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_m, href, label) => `${String(label).replace(/<[^>]+>/g, "").trim()} (${href})`)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map(l => l.trimEnd()).join("\n")
    .trim();
}

/** Send one batch of individual emails. Returns a per-recipient outcome. */
async function resendBatch(
  items: { email: string; subject: string; html: string; text: string; unsubUrl: string }[],
): Promise<Outcome[]> {
  const payload = items.map(i => ({
    from: FROM_ADDRESS,
    ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
    to: [i.email],
    subject: i.subject,
    html: i.html,
    text: i.text,
    headers: {
      "List-Unsubscribe": `<${i.unsubUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  }));

  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    const error = `Resend ${res.status}: ${text.slice(0, 300)}`;
    return items.map(i => ({ email: i.email, status: "failed" as const, error }));
  }

  // Resend returns { data: [{ id }, ...] } in the same order as the request.
  let ids: { id?: string }[] = [];
  try { ids = (await res.json())?.data ?? []; } catch { /* treat as all-sent below */ }

  return items.map((i, idx) => {
    const entry = ids[idx] as { id?: string; error?: unknown } | undefined;
    if (entry && !entry.id) {
      return { email: i.email, status: "failed" as const, error: JSON.stringify(entry).slice(0, 300) };
    }
    return { email: i.email, status: "sent" as const };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!RESEND_API_KEY) return json(500, { error: "RESEND_API_KEY not configured" });

  // Either the scheduler's shared secret or an admin session.
  const presented = req.headers.get("x-dispatch-secret") ?? "";
  const viaScheduler = !!DISPATCH_SECRET && presented === DISPATCH_SECRET;
  if (!viaScheduler) {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;
  }

  let body: {
    subject?: string;
    html?: string;
    text?: string;
    recipients?: string[];
    campaign_id?: string;
    /** Test sends go to the admin only and skip the unsubscribed check. */
    is_test?: boolean;
    /**
     * Warm-up tranche. A domain with no sending history that suddenly emits
     * its whole list in one burst is the exact shape reputation systems are
     * built to catch. Send a slice a day and let the reputation build.
     */
    max_recipients?: number;
  };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  const subject = (body.subject || "").trim();
  const campaign_id = (body.campaign_id || `camp-${Date.now()}`).trim();
  let requested = Array.from(new Set(
    (body.recipients || [])
      .map(e => (e || "").trim().toLowerCase())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
  ));
  const rawHtml = (body.html && body.html.trim())
    || (body.text ? `<p>${escapeHtml(body.text).replace(/\n/g, "<br/>")}</p>` : "");

  if (!subject) return json(400, { error: "subject is required" });
  if (!rawHtml) return json(400, { error: "html or text body is required" });
  if (!requested.length) return json(400, { error: "recipients must contain at least one valid email" });

  const db = serviceClient();

  // Anyone already sent this campaign is skipped, so pressing Send again the
  // next day continues the same campaign rather than mailing people twice.
  let alreadySent = 0;
  if (!body.is_test) {
    const { data: done } = await db
      .from("newsletter_send_log")
      .select("recipient_email")
      .eq("campaign_id", campaign_id)
      .eq("status", "sent");
    const seen = new Set((done ?? []).map((r: { recipient_email: string }) => r.recipient_email.toLowerCase()));
    if (seen.size) {
      const before = requested.length;
      requested = requested.filter(e => !seen.has(e));
      alreadySent = before - requested.length;
    }
  }

  // Honour unsubscribes server-side. The admin UI filters too, but a stale page
  // or a direct call must not reach somebody who opted out.
  let uniq: string[] = requested;
  let suppressed = 0;
  if (!body.is_test) {
    const { data: optedOut } = await db
      .from("newsletter")
      .select("email")
      .eq("unsubscribed", true)
      .in("email", requested);
    const blocked = new Set((optedOut ?? []).map((r: { email: string }) => r.email.toLowerCase()));
    uniq = requested.filter(e => !blocked.has(e));
    suppressed = requested.length - uniq.length;
    if (!uniq.length) {
      return json(200, {
        success: true, sent: 0, total: 0, suppressed, already_sent: alreadySent,
        remaining: 0, errors: [], campaign_id,
      });
    }
  }

  if (!body.is_test) {
    const health = await bounceRate(db, campaign_id);
    if (health.sample >= BOUNCE_MIN_SAMPLE && health.rate > BOUNCE_LIMIT) {
      return json(200, {
        success: false, sent: 0, total: 0, suppressed, already_sent: alreadySent,
        remaining: uniq.length, campaign_id, blocked: true,
        errors: [
          `Stopped: ${health.bad} of ${health.sample} messages in this campaign have bounced ` +
          `(${Math.round(health.rate * 100)}%). Sending more would damage the domain's ` +
          `reputation. Check the send log before continuing.`,
        ],
      });
    }
  }

  const cap = Number(body.max_recipients ?? 0);
  let remaining = 0;
  if (cap > 0 && uniq.length > cap) {
    remaining = uniq.length - cap;
    uniq = uniq.slice(0, cap);
  }

  const identity = await readIdentity(db);
  const signOff = identity.signature ? `\n\n${identity.signature}` : "";
  const postal = identity.address ? `\n${identity.address.replace(/\n/g, ", ")}` : "";

  const items = await Promise.all(uniq.map(async (email) => {
    const unsubUrl = await unsubscribeUrl(email);
    const html = wrapHtml(subject, rawHtml, unsubUrl, identity);
    return {
      email, subject, unsubUrl, html,
      text: `${htmlToText(rawHtml)}${signOff}\n\n—\nCherubs Cove Ministry${postal}\nUnsubscribe: ${unsubUrl}`,
    };
  }));

  const outcomes: Outcome[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    outcomes.push(...await resendBatch(items.slice(i, i + BATCH_SIZE)));
  }

  const sent = outcomes.filter(o => o.status === "sent").length;
  const errors = Array.from(new Set(outcomes.filter(o => o.error).map(o => o.error!)));

  const inserts = outcomes.map(o => ({
    campaign_id,
    recipient_email: o.email,
    subject,
    status: o.status,
    error_message: o.error || null,
  }));
  for (let i = 0; i < inserts.length; i += 50) {
    const { error } = await db.from("newsletter_send_log").insert(inserts.slice(i, i + 50));
    if (error) console.error("Failed to record delivery log:", error.message);
  }

  return json(200, {
    success: errors.length === 0,
    sent,
    total: uniq.length,
    suppressed,
    already_sent: alreadySent,
    remaining,
    warnings: identity.address ? [] : [
      "No postal address is set, and commercial email is required by law to carry one. Add it under Settings \u2192 Newsletter.",
    ],
    batches: Math.ceil(items.length / BATCH_SIZE),
    errors,
    campaign_id,
  });
});
