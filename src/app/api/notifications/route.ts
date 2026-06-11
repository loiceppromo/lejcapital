/**
 * GET  /api/notifications       — fetch unread/all notifications for current user
 * POST /api/notifications       — mark notification(s) as read
 *
 * Query params:
 *   ?all=1   — include read notifications (default: unread only)
 *   ?limit=N — max results (default: 20, max: 100)
 *
 * POST body (JSON):
 *   { id: string }              — mark single notification as read
 *   { markAllRead: true }       — mark all as read
 */
import { getCurrentUser } from '@/lib/auth/server';
import {
  getUnreadNotifications,
  getNotifications,
  markNotificationRead,
  markAllRead,
} from '@/lib/notifications/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const url = new URL(request.url);
    const all = url.searchParams.get('all') === '1';
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') ?? '20', 10) || 20,
      100,
    );

    const notifications = all
      ? await getNotifications(user.id, limit)
      : await getUnreadNotifications(user.id);

    return Response.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt?.toISOString() ?? null,
      })),
      unreadCount: all
        ? notifications.filter((n) => !n.read).length
        : notifications.length,
    });
  } catch {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    if (body.markAllRead) {
      await markAllRead(user.id);
      return Response.json({ ok: true });
    }

    if (body.id && typeof body.id === 'string') {
      const updated = await markNotificationRead(body.id);
      if (!updated) {
        return Response.json({ error: 'Notification not found.' }, { status: 404 });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Provide { id } or { markAllRead: true }.' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }
}
