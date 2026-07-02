import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingEnvVars = [
  !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
  !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
].filter(Boolean) as string[];

export const supabaseConfigError =
  missingEnvVars.length > 0
    ? `Missing required Supabase env var${missingEnvVars.length > 1 ? 's' : ''}: ${missingEnvVars.join(', ')}`
    : null;

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
