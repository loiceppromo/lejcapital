'use server';

import { getDb, isDatabaseConfigured } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server';
import { isAIConfigured } from '@/lib/ai/client';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Write an audit log entry. Called automatically by server actions.
 * When OpenAI is configured, also generates an AI narrative for the log.
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

    let aiNarrative: string | undefined;
    if (isAIConfigured()) {
      try {
        const { aiGenerateLog } = await import('./ai');
        const result = await aiGenerateLog(action, entityType, (data ?? {}) as Record<string, unknown>);
        if (result.ok && result.reply) aiNarrative = result.reply;
      } catch {
        // AI narrative is best-effort
      }
    }

    const afterData = data ? { ...(data as Record<string, unknown>) } : {};
    if (aiNarrative) (afterData as Record<string, unknown>).aiNarrative = aiNarrative;

    await db.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        after: afterData as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}
