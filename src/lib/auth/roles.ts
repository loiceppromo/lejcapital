/**
 * Role-based access control for LEJ Capital — server-side module.
 *
 * Re-exports pure functions from role-defs.ts and adds the DB-dependent getUserRole.
 * Import from here in server components/actions. Import from role-defs.ts in client components.
 */

export { canAccess, canAccessRoute, getNavItemsForRole, type Role } from './role-defs';

import { getDb, isDatabaseConfigured } from '@/lib/db';
import type { Role } from './role-defs';

/** Get role for a given email. Returns FUND_MANAGER for the admin, looks up DB for others. */
export async function getUserRole(email: string | null | undefined): Promise<Role> {
  if (!email) return 'INVESTOR'; // safest default

  if (!isDatabaseConfigured()) return 'FUND_MANAGER'; // seed mode

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (db as any).user.findUnique({ where: { email: email.toLowerCase() } });
    if (user && user.role) return user.role as Role;
  } catch {
    // DB not available — fall through
  }

  // Unknown user defaults to most restrictive
  return 'INVESTOR';
}
