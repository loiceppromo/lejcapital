/**
 * Server-side page access guard.
 *
 * Call this at the top of any server component page to enforce role-based access.
 * If the user lacks permission, it redirects to /dashboard with an error param.
 */
import { redirect } from 'next/navigation';
import { getCurrentUser } from './server';
import { canAccessRoute, type Role } from './roles';

/**
 * Require that the current user can access the given route.
 * Redirects to dashboard if denied. Returns the user's role.
 */
export async function guardPage(pathname: string): Promise<{ role: Role; email: string | null }> {
  const user = await getCurrentUser();
  if (!canAccessRoute(user.role, pathname)) {
    redirect('/dashboard?error=access_denied');
  }
  return { role: user.role, email: user.email };
}
