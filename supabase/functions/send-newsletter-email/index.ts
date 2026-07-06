// Supabase Edge Function: send-newsletter-email
//
// Sends a single email to one or many recipients (BCC) via Resend.
// Used by the Admin dashboard for bulk newsletter blasts and individual sends.
//
// Environment:
//   RESEND_API_KEY              — Resend API key (already configured)
//   SUPABASE_URL, SUPABASE_ANON_KEY — auto-populated by Supabase
//
// Auth: requires the caller's Supabase JWT (Authorization: Bearer <token>).
// Any authenticated user is allowed (admin-only route is enforced client-side
// via the /quiveradminconsole007 path and admin list check).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const FROM_ADDRESS = "Cherubs Cove Ministry <noreply@cherubscove.net>";
const BATCH_SIZE = 45; // Resend allows up to 50 BCC per send

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapHtml(subject: string, bodyHtml: string): string {
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
      You're receiving this because you subscribed to updates from Cherubs Cove Ministry.
    </td></tr>
  </table>
</body></html>`;
}

async function resendSend(bcc: string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [FROM_ADDRESS],
      bcc,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${text}` };
  }
  return { ok: true };
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!RESEND_API_KEY) return json(500, { error: "RESEND_API_KEY not configured" });

  // Auth check
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Missing Authorization" });

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await supa.auth.getUser(token);
    if (error || !data?.user) return json(401, { error: "Invalid session" });
  }

  let body: {
    subject?: string;
    html?: string;
    text?: string;
    recipients?: string[];
  };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  const subject = (body.subject || "").trim();
  const recipients = (body.recipients || [])
    .map(e => (e || "").trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  const uniq = Array.from(new Set(recipients));
  const rawHtml = (body.html && body.html.trim()) || (body.text ? `<p>${escapeHtml(body.text).replace(/\n/g, "<br/>")}</p>` : "");

  if (!subject) return json(400, { error: "subject is required" });
  if (!rawHtml) return json(400, { error: "html or text body is required" });
  if (!uniq.length) return json(400, { error: "recipients must contain at least one valid email" });

  const html = wrapHtml(subject, rawHtml);

  const batches: string[][] = [];
  for (let i = 0; i < uniq.length; i += BATCH_SIZE) batches.push(uniq.slice(i, i + BATCH_SIZE));

  let sent = 0;
  const errors: string[] = [];
  for (const batch of batches) {
    const r = await resendSend(batch, subject, html);
    if (r.ok) sent += batch.length;
    else errors.push(r.error!);
  }

  return json(200, {
    success: errors.length === 0,
    sent,
    total: uniq.length,
    batches: batches.length,
    errors,
  });
}

Deno.serve(handle);
