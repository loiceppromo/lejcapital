'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export async function addUser(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected. User management requires live mode.' };
  await requirePermission('MANAGE_SETTINGS');

  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const role = formData.get('role') as string;

  if (!name || !email || !role) {
    return { ok: false, error: 'Name, email, and role are required.' };
  }

  if (!['FUND_MANAGER', 'OPERATOR', 'INVESTOR'].includes(role)) {
    return { ok: false, error: 'Invalid role. Must be FUND_MANAGER, OPERATOR, or INVESTOR.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Invalid email address.' };
  }

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (db as any).user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false, error: `A user with email ${email} already exists.` };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (db as any).user.create({
      data: { name, email, role },
    });

    await writeAuditLog('MANAGE_SETTINGS', 'User', user.id as string, { name, email, role, action: 'create' });
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateUserRole(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('MANAGE_SETTINGS');

  const userId = formData.get('userId') as string;
  const role = formData.get('role') as string;

  if (!userId || !role) {
    return { ok: false, error: 'User ID and role are required.' };
  }

  if (!['FUND_MANAGER', 'OPERATOR', 'INVESTOR'].includes(role)) {
    return { ok: false, error: 'Invalid role.' };
  }

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (db as any).user.update({
      where: { id: userId },
      data: { role },
    });

    await writeAuditLog('MANAGE_SETTINGS', 'User', userId, { email: user.email, role, action: 'update_role' });
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function toggleUserActive(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('MANAGE_SETTINGS');

  const userId = formData.get('userId') as string;
  const active = formData.get('active') === 'true';

  if (!userId) {
    return { ok: false, error: 'User ID is required.' };
  }

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (db as any).user.update({
      where: { id: userId },
      data: { active },
    });

    await writeAuditLog('MANAGE_SETTINGS', 'User', userId, {
      email: user.email,
      active,
      action: active ? 'reactivate' : 'deactivate',
    });
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Load all users from DB */
export async function getUsers() {
  if (!isDatabaseConfigured()) return [];
  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (db as any).user.findMany({ orderBy: { createdAt: 'desc' } });
  } catch {
    return [];
  }
}
