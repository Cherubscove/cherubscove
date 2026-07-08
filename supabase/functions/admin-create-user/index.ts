// Supabase Edge Function: admin-create-user
//
// Allows a super admin to create a new auth user (admin or super admin)
// without signing them in, preserving the caller's session.
//
// Environment:
//   SUPABASE_URL, SUPABASE_ANON_KEY — auto-populated by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase runtime
//
// Auth: requires the caller's Supabase JWT (Authorization: Bearer <token>).
// Only super admins can call this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPER_ADMIN_EMAIL = "cherubscove@gmail.com";

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json(401, { error: "Missing Authorization header" });
    }

    // Parse request body
    const { target_email, password } = await req.json();
    if (!target_email || !password) {
      return json(400, { error: "target_email and password are required" });
    }

    if (password.length < 6) {
      return json(400, { error: "Password must be at least 6 characters" });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json(500, { error: "Server configuration error" });
    }

    // Create a Supabase client with the caller's JWT to verify identity
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: authError } =
      await callerClient.auth.getUser();
    if (authError || !caller?.email) {
      return json(401, { error: "Unable to authenticate caller" });
    }

    const callerEmail = caller.email.toLowerCase();

    // Create a Supabase admin client with service_role key
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if caller is a super admin
    const { data: settingsData } = await adminClient
      .from("site_settings")
      .select("value")
      .eq("key", "admin_users_json")
      .single();

    let adminList: { email: string; role: string }[] = [];
    if (settingsData?.value) {
      try {
        adminList = JSON.parse(settingsData.value);
      } catch {
        /* ignore parse errors */
      }
    }

    const isSuperAdmin =
      callerEmail === SUPER_ADMIN_EMAIL.toLowerCase() ||
      adminList.some(
        (a) =>
          a.email.toLowerCase() === callerEmail && a.role === "super_admin",
      );

    if (!isSuperAdmin) {
      return json(403, { error: "Only a super admin can create new admin users." });
    }

    // Check if a user with this email already exists in auth
    const { data: usersData, error: listError } =
      await adminClient.auth.admin.listUsers();
    if (listError) {
      console.error("Failed to list users:", listError);
      return json(500, { error: "Failed to list auth users" });
    }

    const existingUser = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === target_email.toLowerCase(),
    );

    if (!existingUser) {
      // Create the user via Admin API (does NOT affect caller's session)
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: target_email,
          password: password,
          email_confirm: true, // Auto-confirm since this is an admin invite
        });

      if (createError) {
        console.error("Failed to create user:", createError);
        return json(500, {
          error: `Failed to create user: ${createError.message}`,
        });
      }

      console.log(`Created auth user: ${newUser?.user?.email}`);
    } else {
      console.log(`User ${target_email} already exists in auth — skipping creation.`);
    }

    return json(200, { success: true, email: target_email, already_existed: !!existingUser });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json(500, { error: String(err) });
  }
});
