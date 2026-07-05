// Supabase Edge Function: send-form-email
//
// Sends two emails via Resend when a form is submitted:
//   1. Confirmation email to the submitter (if submitterEmail is provided)
//   2. Notification email to the admin (always)
//
// Environment variables (set via `supabase secrets set`):
//   RESEND_API_KEY       — Resend API key
//   ADMIN_NOTIFY_EMAIL   — Email address for admin notifications
//
// The function is intentionally kept dependency-free: it uses only the Deno
// standard library and plain fetch() to call the Resend API.


// ── Configuration ────────────────────────────────────────────────────────

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ADMIN_NOTIFY_EMAIL = Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "";
const FROM_ADDRESS = "Cherubs Cove Ministry <noreply@cherubscove.net>";

// ── CORS headers ─────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Resend helper ────────────────────────────────────────────────────────

async function sendResendEmail(
  to: string,
  subject: string,
  fields: { label: string; value: string }[],
  recipientName?: string,
): Promise<{ ok: boolean; error?: string }> {
  // Build a simple HTML email with a label/value table
  const rows = fields
    .map((f) => {
      const escapedLabel = f.label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const escapedValue = (f.value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;white-space:nowrap;vertical-align:top">${escapedLabel}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151">${escapedValue}</td>
      </tr>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px">
  <table cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr>
      <td style="padding:32px 32px 16px;text-align:center;background:linear-gradient(135deg,#1e1b1a,#3a2a22)">
        <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600">Cherubs Cove Ministry</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px">
        ${recipientName ? `<p style="margin:0 0 16px;color:#374151;font-size:15px">Dear ${recipientName.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")},</p>` : ""}
        <p style="margin:0 0 16px;color:#374151;font-size:15px">${subject} — here is a summary of your submission:</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:1px solid #e5e7eb">Field</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:1px solid #e5e7eb">Value</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:16px 0 0;color:#9ca3af;font-size:13px">This is an automated message — please do not reply directly.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `Resend API error ${response.status}: ${body}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Subjects ─────────────────────────────────────────────────────────────

function buildSubjects(
  formType: string,
  eventTitle?: string,
): { confirmSubject: string; notifySubject: string } {
  switch (formType) {
    case "registration":
      return {
        confirmSubject: eventTitle
          ? `Registration Confirmation — ${eventTitle}`
          : "Registration Confirmation",
        notifySubject: eventTitle
          ? `New registration submission — ${eventTitle}`
          : "New registration submission",
      };
    case "newsletter":
      return {
        confirmSubject: "Newsletter Subscription Confirmed",
        notifySubject: "New newsletter submission",
      };
    case "connect":
      return {
        confirmSubject: "Message Received — Cherubs Cove Ministry",
        notifySubject: "New connect form submission",
      };
    default:
      return {
        confirmSubject: "Submission Confirmed",
        notifySubject: `New ${formType} submission`,
      };
  }
}

// ── Request handler ──────────────────────────────────────────────────────

async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate that required env vars are set
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  if (!ADMIN_NOTIFY_EMAIL) {
    console.error("ADMIN_NOTIFY_EMAIL is not set");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let body: {
    formType?: string;
    submitterEmail?: string;
    submitterName?: string;
    eventTitle?: string;
    fields?: { label: string; value: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const formType = body.formType ?? "unknown";
  const submitterEmail = body.submitterEmail;
  const submitterName = body.submitterName;
  const eventTitle = body.eventTitle;
  const fields = body.fields ?? [];

  if (fields.length === 0) {
    console.warn("send-form-email called with empty fields array");
  }

  const { confirmSubject, notifySubject } = buildSubjects(formType, eventTitle);

  // Track overall success/failure so we can return a meaningful status
  const errors: string[] = [];

  // 1. Confirmation email to the submitter (if we have their email)
  if (submitterEmail) {
    const result = await sendResendEmail(
      submitterEmail,
      confirmSubject,
      fields,
      submitterName,
    );
    if (!result.ok) {
      console.error(`Failed to send confirmation to ${submitterEmail}: ${result.error}`);
      errors.push(`confirmation: ${result.error}`);
    } else {
      console.log(`Confirmation email sent to ${submitterEmail}`);
    }
  }

  // 2. Notification email to the admin (always)
  {
    const result = await sendResendEmail(
      ADMIN_NOTIFY_EMAIL,
      notifySubject,
      fields,
    );
    if (!result.ok) {
      console.error(`Failed to send admin notification to ${ADMIN_NOTIFY_EMAIL}: ${result.error}`);
      errors.push(`admin-notify: ${result.error}`);
    } else {
      console.log(`Admin notification sent to ${ADMIN_NOTIFY_EMAIL}`);
    }
  }

  // Return success if at least the admin notification was sent (or if no errors at all)
  if (errors.length === 0) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Some emails failed but we don't throw — just report
  return new Response(JSON.stringify({ success: false, errors }), {
    status: 200, // still 200 so the caller doesn't treat it as a crash
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Entry point ──────────────────────────────────────────────────────────

Deno.serve(handleRequest);
