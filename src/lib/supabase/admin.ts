import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, isSupabaseConfigured } from './config';

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export function getAdminClient() {
  if (!isSupabaseConfigured() || !SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin client requires SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
