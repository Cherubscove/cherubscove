// Supabase Edge Function: newsletter-dispatch
//
// Drains scheduled campaigns one batch at a time. Called by pg_cron via pg_net
// with a shared secret, or by an admin pressing "Run now" — the same code path
// either way, so what the scheduler does is exactly what the button does.
//
// Recipients are recomputed every pass from the live subscriber list rather
// than frozen when the campaign was created, so anyone who unsubscribes
// between batches is dropped instead of mailed.

import { CORS, json, requireAdmin, serviceClient } from "../_shared/admin.ts";

const DISPATCH_SECRET = Deno.env.get("NEWSLETTER_DISPATCH_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

type DispatchRequest = {
  action?: string;
  id?: string;
  status?: string;
  campaign_id?: string;
  subject?: string;
  html?: string;
  batch_size?: number;
  interval_minutes?: number;
  start_at?: string;
  created_by?: string;
};

type Campaign = {
  id: string; campaign_id: string; subject: string; html: string;
  batch_size: number; interval_minutes: number; sent_count: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const presented = req.headers.get("x-dispatch-secret") ?? "";
  const viaCron = !!DISPATCH_SECRET && presented === DISPATCH_SECRET;
  if (!viaCron) {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;
  }
  if (!DISPATCH_SECRET) return json(500, { error: "NEWSLETTER_DISPATCH_SECRET not configured" });

  const db = serviceClient();
  const now = new Date().toISOString();

  // Admin actions on campaigns share this function so there is one place that
  // knows about scheduling.
  // Read the body ONCE. Consuming it and then calling req.clone() throws,
  // because a clone has to be taken before the body is read.
  const body: DispatchRequest = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : null;

  // Both callers are already authenticated — an admin session or the shared
  // secret — so the actions are open to either. Gating them on the auth mode
  // only made them impossible to exercise from anything but a browser.
  if (action) {
    if (action === "list") {
      const { data } = await db.from("newsletter_campaigns")
        .select("id, campaign_id, subject, batch_size, interval_minutes, next_run_at, status, sent_count, last_run_at, last_reason, last_error, created_at")
        .order("created_at", { ascending: false }).limit(25);
      return json(200, { campaigns: data ?? [] });
    }
    if (action === "schedule") {
      const { error, data } = await db.from("newsletter_campaigns").insert({
        campaign_id: body.campaign_id,
        subject: body.subject,
        html: body.html,
        batch_size: Number(body.batch_size ?? 25),
        interval_minutes: Number(body.interval_minutes ?? 1440),
        next_run_at: body.start_at ?? now,
        created_by: body.created_by ?? null,
      }).select("id").single();
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true, id: data.id });
    }
    if (action === "set_status") {
      const next = String(body.status ?? "");
      if (!["scheduled", "paused", "stopped"].includes(next)) {
        return json(400, { error: "status must be scheduled, paused or stopped" });
      }
      await db.from("newsletter_campaigns")
        .update({ status: next, ...(next === "scheduled" ? { next_run_at: now } : {}) })
        .eq("id", body.id);
      return json(200, { ok: true });
    }
  }

  const { data: due } = await db
    .from("newsletter_campaigns")
    .select("id, campaign_id, subject, html, batch_size, interval_minutes, sent_count")
    .eq("status", "scheduled")
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(5);

  const passes: unknown[] = [];

  for (const c of (due ?? []) as Campaign[]) {
    // Everyone still on the list who has not had this campaign.
    const [{ data: subs }, { data: sentRows }] = await Promise.all([
      db.from("newsletter").select("email").eq("unsubscribed", false),
      db.from("newsletter_send_log").select("recipient_email")
        .eq("campaign_id", c.campaign_id).eq("status", "sent"),
    ]);
    const already = new Set((sentRows ?? []).map((r: { recipient_email: string }) => r.recipient_email.toLowerCase()));
    const pending = (subs ?? [])
      .map((r: { email: string }) => r.email.toLowerCase())
      .filter((e: string) => !already.has(e));

    if (!pending.length) {
      await db.from("newsletter_campaigns").update({
        status: "done", last_run_at: now, last_reason: "Everyone on the list has had it.",
      }).eq("id", c.id);
      passes.push({ campaign: c.campaign_id, reason: "empty", sent: 0 });
      continue;
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-newsletter-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-dispatch-secret": DISPATCH_SECRET },
      body: JSON.stringify({
        subject: c.subject, html: c.html, campaign_id: c.campaign_id,
        recipients: pending, max_recipients: c.batch_size,
      }),
    });
    const out = await res.json().catch(() => ({}));

    // The send refuses on its own when a campaign is bouncing badly. Respect
    // that here rather than rescheduling straight into the same wall.
    if (out?.blocked) {
      await db.from("newsletter_campaigns").update({
        status: "paused", last_run_at: now,
        last_error: (out.errors ?? []).join("; ").slice(0, 900),
        last_reason: "Paused: too many bounces. Nothing more goes out until you resume it.",
      }).eq("id", c.id);
      passes.push({ campaign: c.campaign_id, reason: "bouncing", sent: 0 });
      continue;
    }

    const sent = Number(out?.sent ?? 0);
    const remaining = Number(out?.remaining ?? 0);
    const finished = remaining === 0;

    await db.from("newsletter_campaigns").update({
      sent_count: c.sent_count + sent,
      last_run_at: now,
      last_error: (out?.errors ?? []).length ? out.errors.join("; ").slice(0, 900) : null,
      status: finished ? "done" : "scheduled",
      next_run_at: finished
        ? now
        : new Date(Date.now() + c.interval_minutes * 60_000).toISOString(),
      last_reason: finished
        ? `Finished — ${c.sent_count + sent} sent in total.`
        : `Sent ${sent}; ${remaining} still to go, next batch in ${c.interval_minutes} minutes.`,
    }).eq("id", c.id);

    passes.push({ campaign: c.campaign_id, sent, remaining, reason: finished ? "done" : "batch" });
  }

  return json(200, { ran: passes.length, passes });
});
