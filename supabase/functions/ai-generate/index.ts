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
    maxTokens: 900,
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
      i.details ? `\nDetails that must appear:\n${i.details}` : ""}`,
  },

  seo: {
    feature: "seo",
    maxTokens: 300,
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
    maxTokens: 500,
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
    maxTokens: 700,
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

  const input = body.input ?? {};
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
