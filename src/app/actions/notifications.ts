'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/server';
import { markNotificationRead, markAllRead, getUnreadNotifications, getNotifications } from '@/lib/notifications/service';
import type { ActionResult } from './market';

export async function markRead(formData: FormData): Promise<ActionResult> {
  const notificationId = formData.get('notificationId') as string;
  if (!notificationId) return { ok: false, error: 'Notification ID required.' };

  await markNotificationRead(notificationId);
  revalidatePath('/');
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await getCurrentUser();
  await markAllRead(user.id);
  revalidatePath('/');
  return { ok: true };
}

export async function getUnreadCount(): Promise<number> {
  const user = await getCurrentUser();
  const unread = await getUnreadNotifications(user.id);
  return unread.length;
}

export async function getNotificationList(limit = 50) {
  const user = await getCurrentUser();
  return getNotifications(user.id, limit);
}
