// Vercel Serverless Function: admin-update-password
//
// Allows a super admin to change any admin's password.
// Also allows any authenticated admin to change their own password.
//
// Environment (set in Vercel dashboard):
//   SUPABASE_URL — your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — your Supabase service_role key
//
// Call from the frontend:
//   POST /api/admin-update-password
//   Authorization: Bearer <supabase access token>
//   Body: { target_email: string, new_password: string }

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SUPER_ADMIN_EMAIL = 'cherubscove@gmail.com';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const { target_email, new_password } = req.body;
    if (!target_email || !new_password) {
      return res.status(400).json({ error: 'target_email and new_password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create a Supabase client with the caller's JWT to verify identity
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: authError } =
      await callerClient.auth.getUser();
    if (authError || !caller?.email) {
      return res.status(401).json({ error: 'Unable to authenticate caller' });
    }

    const callerEmail = caller.email.toLowerCase();

    // Create a Supabase admin client with service_role key
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if caller is a super admin
    const { data: settingsData } = await adminClient
      .from('site_settings')
      .select('value')
      .eq('key', 'admin_users_json')
      .single();

    let adminList = [];
    if (settingsData?.value) {
      try { adminList = JSON.parse(settingsData.value); } catch { /* ignore */ }
    }

    const isSuperAdmin =
      callerEmail === SUPER_ADMIN_EMAIL.toLowerCase() ||
      adminList.some(
        (a) => a.email.toLowerCase() === callerEmail && a.role === 'super_admin'
      );

    // Determine if this is an own-password change or admin-forced change
    const isOwnChange = target_email.toLowerCase() === callerEmail;

    if (!isOwnChange && !isSuperAdmin) {
      return res.status(403).json({
        error: "Only a super admin can change another user's password. You can change your own password.",
      });
    }

    // Find the target user by email using the Admin API
    const { data: usersData, error: listError } =
      await adminClient.auth.admin.listUsers();
    if (listError) {
      console.error('Failed to list users:', listError);
      return res.status(500).json({ error: 'Failed to list auth users' });
    }

    const targetUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === target_email.toLowerCase()
    );
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the user's password
    const { error: updateError } =
      await adminClient.auth.admin.updateUserById(targetUser.id, {
        password: new_password,
      });

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return res.status(500).json({ error: `Failed to update password: ${updateError.message}` });
    }

    return res.status(200).json({ success: true, email: target_email });
  } catch (err) {
    console.error('Unhandled error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
