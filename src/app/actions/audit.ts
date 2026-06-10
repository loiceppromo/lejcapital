'use server';

import { getDb, isDatabaseConfigured } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Write an audit log entry. Called automatically by server actions.
 * Non-blocking — errors are logged but don't fail the parent action.
 */
export async function writeAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  data?: Prisma.InputJsonValue,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    const actor = await getCurrentUser();
    const db = await getDb();
    const actorId = actor.id && actor.email
      ? (await db.user.upsert({
          where: { email: actor.email },
          create: {
            id: actor.id,
            email: actor.email,
            name: actor.email,
            role: actor.role,
          },
          update: { active: true, role: actor.role },
        })).id
      : null;

    await db.auditLog.create({
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
