// Supabase Edge Function: newsletter-unsubscribe
//
// Public, unauthenticated (verify_jwt = false). Reached from the footer link and
// the List-Unsubscribe header of every newsletter send.
//
//   GET  ?e=<email>&t=<token>   → confirmation page
//   POST ?e=<email>&t=<token>   → one-click unsubscribe (RFC 8058)
//
// The token is an HMAC of the email, so the link only unsubscribes its own owner.

import { serviceClient } from "../_shared/admin.ts";
import { verifyUnsubscribeToken } from "../_shared/unsubscribe.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function page(title: string, message: string, status = 200) {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:48px 16px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <h1 style="margin:0 0 12px;font-size:20px;color:#1e1b1a">${escapeHtml(title)}</h1>
    <p style="margin:0;color:#374151;font-size:15px;line-height:1.7">${message}</p>
  </div>
</body></html>`,
    { status, headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET" && req.method !== "POST") {
    return page("Not allowed", "This link does not support that request.", 405);
  }

  const url = new URL(req.url);
  const email = (url.searchParams.get("e") || "").trim().toLowerCase();
  const token = (url.searchParams.get("t") || "").trim();

  if (!email || !token || !(await verifyUnsubscribeToken(email, token))) {
    return page(
      "That link is not valid",
      "The unsubscribe link is incomplete or has been altered. Reply to any of our emails and we will remove you by hand.",
      400,
    );
  }

  try {
    const db = serviceClient();
    const { error } = await db
      .from("newsletter")
      .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() })
      .eq("email", email);
    if (error) throw error;
  } catch (err) {
    console.error("Unsubscribe failed:", err);
    return page(
      "Something went wrong",
      "We could not update your preferences just now. Please try again in a few minutes.",
      500,
    );
  }

  return page(
    "You have been unsubscribed",
    `<strong>${escapeHtml(email)}</strong> will no longer receive newsletters from Cherubs Cove Ministry. Nothing else needs doing.`,
  );
});
