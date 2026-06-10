import { isDatabaseConfigured } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export type AuthMode = 'supabase' | 'seed' | 'blocked';

export function getAuthMode(): AuthMode {
  if (isSupabaseConfigured()) return 'supabase';
  if (!isDatabaseConfigured()) return 'seed';
  if (process.env.NODE_ENV !== 'production' && process.env.LEJ_ALLOW_DB_SEED_MODE === '1') {
    return 'seed';
  }
  return 'blocked';
}
