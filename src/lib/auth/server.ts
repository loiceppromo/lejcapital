'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getAuthMode } from './mode';
import { getUserRole, canAccess, type Role } from './roles';

export interface CurrentUser {
  id: string | null;
  email: string | null;
  role: Role;
}

/**
 * Get the current authenticated user with their role.
 * In seed mode, returns a FUND_MANAGER with no ID.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  if (!isSupabaseConfigured()) {
    if (getAuthMode() === 'blocked') {
      throw new Error('Supabase Auth must be configured before using a persistent database.');
    }
    if (process.env.LEJ_ENABLE_TEST_ROLE === '1') {
      const cookieStore = await cookies();
      const cookieRole = cookieStore.get('lej_test_role')?.value;
      const cookieEmail = cookieStore.get('lej_test_email')?.value;
      const envRole = process.env.LEJ_TEST_ROLE;
      const envEmail = process.env.LEJ_TEST_EMAIL;
      const role = isRole(cookieRole) ? cookieRole : isRole(envRole) ? envRole : null;
      if (role) {
        return { id: null, email: cookieEmail || envEmail || 'e2e-seed-role@lej.local', role };
      }
    }
    return { id: null, email: null, role: 'FUND_MANAGER' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required.');
  }

  const role = await getUserRole(user.email);
  return { id: user.id, email: user.email ?? null, role };
}

/**
 * Require the user to have a specific permission.
 * Throws if the user lacks access.
 */
export async function requirePermission(action: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!canAccess(user.role, action)) {
    throw new Error(`Access denied. ${user.role} cannot perform ${action}.`);
  }
  return user;
}

/**
 * Legacy alias — returns current user (any authenticated user, not just admin).
 * Used by writeAuditLog and other existing callers.
 */
export async function requireAdminAccess(): Promise<{ id: string | null; email: string | null }> {
  const user = await getCurrentUser();
  return { id: user.id, email: user.email };
}

function isRole(value: unknown): value is Role {
  return value === 'FUND_MANAGER' || value === 'OPERATOR' || value === 'INVESTOR';
}
