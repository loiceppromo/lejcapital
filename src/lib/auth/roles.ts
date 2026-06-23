/**
 * Role-based access control for LEJ Capital — server-side module.
 *
 * Re-exports pure functions from role-defs.ts and adds the DB-dependent getUserRole.
 * Import from here in server components/actions. Import from role-defs.ts in client components.
 */

export { canAccess, canAccessRoute, getNavItemsForRole, type Role } from './role-defs';

import { getDb, isDatabaseConfigured } from '@/lib/db';
import type { Role } from './role-defs';

export interface AccountAccess {
  role: Role;
  active: boolean;
}

/**
 * Resolve application access from the LEJ user directory. Supabase proves
 * identity; this record proves the person is an authorised, active platform
 * user. Unknown accounts are never granted an operational role.
 */
export async function getAccountAccess(email: string | null | undefined): Promise<AccountAccess | null> {
  if (!email || !isDatabaseConfigured()) return null;
  try {
    const db = await getDb();
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { role: true, active: true },
    });
    return user ? { role: user.role as Role, active: user.active } : null;
  } catch {
    return null;
  }
}

/** Get a role only for an active user; the fallback is read-only. */
export async function getUserRole(email: string | null | undefined): Promise<Role> {
  if (!isDatabaseConfigured()) return 'FUND_MANAGER'; // deterministic local seed mode
  const account = await getAccountAccess(email);
  return account?.active ? account.role : 'INVESTOR';
}
