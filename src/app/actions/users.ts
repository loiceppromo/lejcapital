'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getAdminClient } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/auth/server';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';
import { UserRole, type User } from '@/generated/prisma/client';

function parseUserRole(value: FormDataEntryValue | null): UserRole | null {
  const role = String(value ?? '');
  return Object.values(UserRole).includes(role as UserRole) ? role as UserRole : null;
}

export async function addUser(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase Auth not configured.' };
  await requirePermission('MANAGE_SETTINGS');

  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = (formData.get('password') as string);
  const role = parseUserRole(formData.get('role'));

  if (!name || !email || !role) {
    return { ok: false, error: 'Name, email, and role are required.' };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Invalid email address.' };
  }

  try {
    const db = await getDb();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false, error: `A user with email ${email} already exists.` };
    }

    const admin = getAdminClient();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return { ok: false, error: `Auth: ${authError.message}` };
    }

    const user = await db.user.create({
      data: { id: authData.user.id, name, email, role },
    });

    await writeAuditLog('MANAGE_SETTINGS', 'User', user.id as string, { name, email, role, action: 'create' });
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function changeUserPassword(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase Auth not configured.' };
  await requirePermission('MANAGE_SETTINGS');

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const newPassword = (formData.get('newPassword') as string);

  if (!email) return { ok: false, error: 'Email is required.' };
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters.' };
  }

  try {
    const admin = getAdminClient();
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
    if (listError) return { ok: false, error: `Auth: ${listError.message}` };

    const authUser = users.find((u) => u.email?.toLowerCase() === email);
    if (!authUser) return { ok: false, error: `No auth account for ${email}.` };

    const { error: updateError } = await admin.auth.admin.updateUserById(authUser.id, { password: newPassword });
    if (updateError) return { ok: false, error: updateError.message };

    await writeAuditLog('MANAGE_SETTINGS', 'User', authUser.id, { email, action: 'change_password' });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateUserRole(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('MANAGE_SETTINGS');

  const userId = formData.get('userId') as string;
  const role = parseUserRole(formData.get('role'));

  if (!userId || !role) {
    return { ok: false, error: 'User ID and role are required.' };
  }

  if (!role) {
    return { ok: false, error: 'Invalid role.' };
  }

  try {
    const db = await getDb();
    const user = await db.user.update({
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
    const user = await db.user.update({
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
export async function getUsers(): Promise<User[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const db = await getDb();
    return await db.user.findMany({ orderBy: { createdAt: 'desc' } });
  } catch {
    return [];
  }
}
