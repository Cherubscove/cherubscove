import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtscvudqhqbxqfagvvus.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0c2N2dWRxaHFieHFmYWd2dnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjQ0NzAsImV4cCI6MjA5MDg0MDQ3MH0.aAZT6OTlkrGAg5IWYhuNCf-OT3NJGJxDPURIpY8M6TM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});
