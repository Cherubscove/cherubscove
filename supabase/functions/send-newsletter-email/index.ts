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
const BATCH_SIZE = 100; // Resend's per-call limit for /emails/batch

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapHtml(subject: string, bodyHtml: string, unsubUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px">
  <table cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr><td style="padding:28px 32px 18px;background:linear-gradient(135deg,#1e1b1a,#3a2a22)">
      <h1 style="margin:0;font-size:20px;color:#ffffff;font-weight:600">Cherubs Cove Ministry</h1>
    </td></tr>
    <tr><td style="padding:28px 32px;color:#374151;font-size:15px;line-height:1.7">
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:16px 32px 28px;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6">
      You're receiving this because you subscribed to updates from Cherubs Cove Ministry.<br/>
      <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
    </td></tr>
  </table>
</body></html>`;
}

type Outcome = { email: string; status: "sent" | "failed"; error?: string };

/** Send one batch of individual emails. Returns a per-recipient outcome. */
async function resendBatch(
  items: { email: string; subject: string; html: string; unsubUrl: string }[],
): Promise<Outcome[]> {
  const payload = items.map(i => ({
    from: FROM_ADDRESS,
    to: [i.email],
    subject: i.subject,
    html: i.html,
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

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  let body: {
    subject?: string;
    html?: string;
    text?: string;
    recipients?: string[];
    campaign_id?: string;
    /** Test sends go to the admin only and skip the unsubscribed check. */
    is_test?: boolean;
  };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  const subject = (body.subject || "").trim();
  const campaign_id = (body.campaign_id || `camp-${Date.now()}`).trim();
  const requested = Array.from(new Set(
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

  // Honour unsubscribes server-side. The admin UI filters too, but a stale page
  // or a direct call must not reach somebody who opted out.
  let uniq = requested;
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
      return json(200, { success: true, sent: 0, total: 0, suppressed, errors: [], campaign_id });
    }
  }

  const items = await Promise.all(uniq.map(async (email) => {
    const unsubUrl = await unsubscribeUrl(email);
    return { email, subject, unsubUrl, html: wrapHtml(subject, rawHtml, unsubUrl) };
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
    batches: Math.ceil(items.length / BATCH_SIZE),
    errors,
    campaign_id,
  });
});
