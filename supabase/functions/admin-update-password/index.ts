// Supabase Edge Function: admin-update-password
//
// Allows a super admin to change any admin's password.
// Also allows any authenticated admin to change their own password.
//
// Environment:
//   SUPABASE_URL, SUPABASE_ANON_KEY — auto-populated by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase runtime
//
// Auth: requires the caller's Supabase JWT (Authorization: Bearer <token>).

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
    const { target_email, new_password } = await req.json();
    if (!target_email || !new_password) {
      return json(400, { error: "target_email and new_password are required" });
    }

    if (new_password.length < 6) {
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

    // Determine if this is an own-password change or admin-forced change
    const isOwnChange = target_email.toLowerCase() === callerEmail;

    if (!isOwnChange && !isSuperAdmin) {
      return json(403, {
        error:
          "Only a super admin can change another user's password. You can change your own password.",
      });
    }

    // Find the target user by email using the Admin API
    const { data: usersData, error: listError } =
      await adminClient.auth.admin.listUsers();
    if (listError) {
      console.error("Failed to list users:", listError);
      return json(500, { error: "Failed to list auth users" });
    }

    const targetUser = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === target_email.toLowerCase(),
    );
    if (!targetUser) {
      return json(404, { error: "User not found" });
    }

    // Update the user's password
    const { error: updateError } =
      await adminClient.auth.admin.updateUserById(targetUser.id, {
        password: new_password,
      });

    if (updateError) {
      console.error("Failed to update password:", updateError);
      return json(500, {
        error: `Failed to update password: ${updateError.message}`,
      });
    }

    return json(200, { success: true, email: target_email });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json(500, { error: String(err) });
  }
});
