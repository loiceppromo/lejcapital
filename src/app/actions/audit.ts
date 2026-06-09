'use server';

import { getDb, isDatabaseConfigured } from '@/lib/db';

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
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).auditLog.create({
      data: {
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
