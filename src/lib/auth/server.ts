'use server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isAllowedAdminEmail } from './policy';

export interface CurrentAdmin {
  id: string | null;
  email: string | null;
}

export async function requireAdminAccess(): Promise<CurrentAdmin> {
  if (!isSupabaseConfigured()) {
    return { id: null, email: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required.');
  }

  if (!isAllowedAdminEmail(user.email)) {
    throw new Error('This account is not authorized for LEJ Capital Management.');
  }

  return { id: user.id, email: user.email ?? null };
}
