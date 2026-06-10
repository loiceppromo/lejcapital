'use server';

import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requireAdminAccess } from '@/lib/auth/server';

/**
 * Write an audit log entry. Called automatically by server actions.
 * Non-blocking — errors are logged but don't fail the parent action.
 */
export async function writeAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    const actor = await requireAdminAccess();
    const db = await getDb();
    const actorId = actor.id && actor.email
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (await (db as any).user.upsert({
          where: { email: actor.email },
          create: {
            id: actor.id,
            email: actor.email,
            name: actor.email,
            role: 'FUND_MANAGER',
          },
          update: { active: true, role: 'FUND_MANAGER' },
        })).id
      : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        after: data ?? {},
      },
    });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}
