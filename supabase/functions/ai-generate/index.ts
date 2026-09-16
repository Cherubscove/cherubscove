// Supabase Edge Function: ai-generate
//
// Every admin-facing AI feature. The chain does the work; this file is prompts
// and validation.
//
// A switched-off feature returns the SAME shape as "no provider configured"
// ({ text: null, configured: false }, HTTP 200), because the caller's response
// to both is identical: use the template and carry on.

import { CORS, json, requireAdmin, serviceClient } from "../_shared/admin.ts";
import { runChain } from "../_shared/ai-chain.ts";
import { aiFeatureOn, type AiFeature } from "../_shared/ai-flags.ts";

const NEVER_INVENT = `You write for Cherubs Cove Ministry, a Christian ministry.
Never invent facts. If the details you are given are thin, write something short
and plainly true rather than something fluent and made up — a flat true sentence
beats a fluent invention. Use only what you are given. British English.
Never use the ministry's name in any other form: it is "Cherubs Cove Ministry".`;

/**
 * Facts about an event, read from the database rather than taken from the
 * browser. The client already has these rows, but a prompt assembled from
 * whatever the page posts is a prompt a caller can dictate — and the whole
 * point of giving the model context is that the context is true.
 */
async function eventContext(db: ReturnType<typeof serviceClient>, eventId: string): Promise<string> {
  const { data: ev } = await db
    .from("events")
    .select("title, theme, description, date, end_date, time, end_time, location, status, registration_enabled")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) return "";

  const when = [ev.date, ev.end_date && ev.end_date !== ev.date ? `to ${ev.end_date}` : "",
                ev.time ? `at ${ev.time}` : "", ev.end_time ? `until ${ev.end_time}` : ""]
    .filter(Boolean).join(" ");

  const lines = [
    `Name: ${ev.title}`,
    ev.theme ? `Theme: ${ev.theme}` : "",
    when ? `When: ${when}` : "",
    ev.location ? `Where: ${ev.location}` : "",
    ev.status ? `Status: ${ev.status}` : "",
    ev.registration_enabled ? "Registration is open on the website." : "",
    ev.description ? `Existing description:\n${ev.description}` : "",
  ].filter(Boolean);

  return `\n\nThese are the event's real details. Use them and do not contradict or embellish them:\n${lines.join("\n")}`;
}

type Task = {
  feature: AiFeature;
  system: string;
  build: (input: Record<string, string>) => string;
  maxTokens: number;
  json?: boolean;
};

const TASKS: Record<string, Task> = {
  newsletter: {
    feature: "newsletter",
    maxTokens: 2400,
    json: true,
    system: `${NEVER_INVENT}
You draft newsletter emails. Warm, direct, unhurried. No exclamation marks, no
marketing hype, no "we are thrilled to". Short paragraphs.
Reply with ONLY a JSON object: {"subject": "...", "html": "..."}
The subject is under 60 characters and says what the email is actually about —
not a teaser. The html is the BODY only: <p> and <ul>/<li> and <strong>, no
<html>, <head>, <body> or styling, and no heading repeating the subject. Do not
write a sign-off with a name unless one is given, and never write an unsubscribe
line — the template already carries one.`,
    build: (i) => `Write a newsletter email about the following.\n\nBrief: ${i.brief}\n${
      i.audience ? `\nAudience: ${i.audience}` : ""}${
      i.details ? `\nDetails that must appear:\n${i.details}` : ""}${i.event_context ?? ""}`,
  },

  seo: {
    feature: "seo",
    maxTokens: 1200,
    json: true,
    system: `${NEVER_INVENT}
You write search-engine metadata. Reply with ONLY a JSON object:
{"title": "...", "description": "..."}
The title is at most 60 characters and names the ministry. The description is
140–158 characters, one or two plain sentences saying what is genuinely on the
page. No keyword stuffing, no ellipses, no "Welcome to".`,
    build: (i) => `Write the SEO title and meta description for this page.\n\nPage: ${i.page}\n${
      i.context ? `\nWhat is on it:\n${i.context}` : ""}`,
  },

  event: {
    feature: "events",
    maxTokens: 1600,
    json: true,
    system: `${NEVER_INVENT}
You write event descriptions. Reply with ONLY a JSON object:
{"description": "...", "completion_message": "..."}
The description is two or three sentences naming the event and, if given, who is
leading it and where — in the sentence itself, e.g. "Rooted is a three-day youth
conference led by Jesse Falodun at ...". The completion_message is one or two
warm sentences shown to somebody immediately after they register.`,
    build: (i) => `Write copy for this event.\n\nName: ${i.name}${
      i.date ? `\nDate: ${i.date}` : ""}${
      i.location ? `\nLocation: ${i.location}` : ""}${
      i.notes ? `\nNotes:\n${i.notes}` : ""}`,
  },

  // The catch-all: any field an admin is typing by hand.
  rewrite: {
    feature: "assistant",
    maxTokens: 1800,
    system: `${NEVER_INVENT}
You help an administrator finish a piece of text they are typing into a form.
Reply with ONLY the finished text — no preamble, no quotation marks around it,
no explanation of what you changed, no markdown fences. Match the length and
register asked for. If the draft is empty, write it from the instruction.`,
    build: (i) => `Field: ${i.field || "text"}${
      i.instruction ? `\nWhat is wanted: ${i.instruction}` : "\nWhat is wanted: improve this"}\n\nDraft:\n${i.draft || "(empty)"}`,
  },
};

/** Models wrap JSON in prose or fences more often than not. */
function parseJson(raw: string): Record<string, string> | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return obj && typeof obj === "object" ? obj : null;
  } catch { return null; }
}

/** Speech-to-text and models alike mangle the ministry's name. Deliberately
 *  narrow — a broad rewrite eventually changes a word somebody meant. */
function tidyName(s: string): string {
  return s.replace(/\bCherub'?s Cove\b/g, "Cherubs Cove")
          .replace(/\bCherubs Cove(?! Ministry)\b/g, "Cherubs Cove Ministry");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  let body: { task?: string; input?: Record<string, string> };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  const task = TASKS[String(body.task ?? "")];
  if (!task) return json(400, { error: `Unknown task "${body.task}"` });

  const db = serviceClient();
  if (!await aiFeatureOn(db, task.feature)) {
    return json(200, { text: null, result: null, configured: false, failures: [] });
  }

  const input = { ...(body.input ?? {}) };
  // The client sends an event id; the facts are fetched here.
  if (input.event_id) {
    input.event_context = await eventContext(db, input.event_id);
    delete input.event_id;
  }

  const result = await runChain(db, task.build(input), {
    system: task.system,
    maxTokens: task.maxTokens,
    // An answer that does not parse as the shape we asked for is THAT PROVIDER
    // failing, and the chain should move on rather than hand the caller junk.
    accept: task.json
      ? (raw) => {
          const o = parseJson(raw);
          return !!o && Object.values(o).some(v => typeof v === "string" && v.trim());
        }
      : (raw) => raw.trim().length > 0,
  });

  if (!result.text) {
    return json(200, {
      text: null, result: null,
      configured: result.configured, failures: result.failures,
      provider: null,
    });
  }

  const parsed = task.json ? parseJson(result.text) : null;
  const tidied = parsed
    ? Object.fromEntries(Object.entries(parsed).map(([k, v]) =>
        [k, typeof v === "string" ? tidyName(v.trim()) : v]))
    : null;

  return json(200, {
    text: task.json ? null : tidyName(result.text.trim()),
    result: tidied,
    configured: true,
    provider: result.provider,
    model: result.model,
    failures: result.failures,
  });
});
