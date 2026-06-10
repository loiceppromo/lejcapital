'use server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
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
