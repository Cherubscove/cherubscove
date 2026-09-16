// Shared admin authentication for edge functions.
//
// The admin roster lives in site_settings under `admin_users_json` (same list the
// Admin console manages). The hardcoded super admin is always an admin, even if
// the row is missing or malformed.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

/** The service-role client every server-side module is handed. */
export type Db = SupabaseClient;

export const SUPER_ADMIN_EMAIL = "cherubscove@gmail.com";
const ADMIN_LIST_KEY = "admin_users_json";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(status: number, body: unknown, headers: Record<string, string> = CORS) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) throw new Error("Supabase service credentials not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export type AdminRole = "super_admin" | "admin";

/**
 * Verify the caller's JWT and that they are on the admin roster.
 * Returns the caller's email and role, or a Response to return immediately.
 */
export async function requireAdmin(
  req: Request,
): Promise<{ email: string; role: AdminRole } | Response> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.trim()) return json(401, { error: "Missing Authorization" });

  let db: Db;
  try { db = serviceClient(); } catch { return json(500, { error: "Server configuration error" }); }

  const caller = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data, error } = await caller.auth.getUser();
  const email = data?.user?.email?.toLowerCase();
  if (error || !email) return json(401, { error: "Invalid session" });

  if (email === SUPER_ADMIN_EMAIL) return { email, role: "super_admin" };

  const { data: row } = await db
    .from("site_settings")
    .select("value")
    .eq("key", ADMIN_LIST_KEY)
    .maybeSingle();

  let roster: { email: string; role: AdminRole }[] = [];
  try { roster = JSON.parse(row?.value ?? "[]"); } catch { roster = []; }

  const match = roster.find(a => (a?.email || "").toLowerCase() === email);
  if (!match) return json(403, { error: "Not authorised" });

  return { email, role: match.role === "super_admin" ? "super_admin" : "admin" };
}
