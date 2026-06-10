/**
 * Notification service for LEJ Capital.
 *
 * Handles in-app notifications with a hook point for future email integration.
 * Notifications are created when key events occur:
 *   - Cycle transitions
 *   - PCR breach/watch alerts
 *   - Loan defaults
 *   - Waterfall runs
 *   - Investor repayments
 */

import { getDb, isDatabaseConfigured } from '@/lib/db';

export type NotificationType =
  | 'CYCLE_TRANSITION'
  | 'PCR_BREACH'
  | 'PCR_WATCH'
  | 'LOAN_DEFAULT'
  | 'WATERFALL_RUN'
  | 'INVESTOR_REPAYMENT'
  | 'SYSTEM_ALERT';

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  /** If null, notification is broadcast (visible to all FUND_MANAGERs) */
  userId?: string | null;
}

/**
 * Create a notification. In-app only for now.
 * Returns the created notification or null if DB isn't configured.
 */
export async function createNotification(params: CreateNotificationParams) {
  if (!isDatabaseConfigured()) return null;

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notification = await (db as any).notification.create({
      data: {
        type: params.type,
        channel: 'IN_APP',
        title: params.title,
        body: params.body,
        metadata: params.metadata ?? null,
        userId: params.userId ?? null,
      },
    });
    return notification;
  } catch (err) {
    console.error('[notifications] Failed to create notification:', err);
    return null;
  }
}

/**
 * Get unread notifications for a user. Also includes broadcast notifications (userId = null).
 */
export async function getUnreadNotifications(userId: string | null) {
  if (!isDatabaseConfigured()) return [];

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (db as any).notification.findMany({
      where: {
        read: false,
        OR: [
          { userId },
          { userId: null }, // broadcast
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  } catch {
    return [];
  }
}

/**
 * Get all notifications (paged) for a user.
 */
export async function getNotifications(userId: string | null, limit = 50) {
  if (!isDatabaseConfigured()) return [];

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (db as any).notification.findMany({
      where: {
        OR: [
          { userId },
          { userId: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch {
    return [];
  }
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: string) {
  if (!isDatabaseConfigured()) return null;

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (db as any).notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });
  } catch {
    return null;
  }
}

/**
 * Mark all unread notifications as read for a user.
 */
export async function markAllRead(userId: string | null) {
  if (!isDatabaseConfigured()) return;

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).notification.updateMany({
      where: {
        read: false,
        OR: [
          { userId },
          { userId: null },
        ],
      },
      data: { read: true, readAt: new Date() },
    });
  } catch {
    // silently fail
  }
}

// ─── Convenience helpers for common notification types ───

export async function notifyCycleTransition(cycleNo: number, fromStatus: string, toStatus: string) {
  return createNotification({
    type: 'CYCLE_TRANSITION',
    title: `Cycle ${cycleNo} transitioned`,
    body: `Cycle ${cycleNo} moved from ${fromStatus} to ${toStatus}.`,
    metadata: { cycleNo, fromStatus, toStatus },
  });
}

export async function notifyPCRBreach(pcr: number) {
  return createNotification({
    type: 'PCR_BREACH',
    title: 'PCR breach alert',
    body: `PCR has fallen to ${pcr.toFixed(2)}x, below the 1.00x protection threshold. Immediate action required.`,
    metadata: { pcr },
  });
}

export async function notifyPCRWatch(pcr: number) {
  return createNotification({
    type: 'PCR_WATCH',
    title: 'PCR watch alert',
    body: `PCR is ${pcr.toFixed(2)}x, in the watch zone (1.00x-1.25x). Monitor closely.`,
    metadata: { pcr },
  });
}

export async function notifyLoanDefault(borrowerName: string, loanId: string, daysPastDue: number) {
  return createNotification({
    type: 'LOAN_DEFAULT',
    title: `Loan default: ${borrowerName}`,
    body: `Loan ${loanId.slice(0, 8)} is ${daysPastDue} days past due. Provision has been adjusted.`,
    metadata: { borrowerName, loanId, daysPastDue },
  });
}

export async function notifyWaterfallRun(cycleNo: number, totalDistributed: string) {
  return createNotification({
    type: 'WATERFALL_RUN',
    title: `Waterfall run completed`,
    body: `Cycle ${cycleNo} waterfall distributed GHS ${totalDistributed} across priority claims.`,
    metadata: { cycleNo, totalDistributed },
  });
}

export async function notifyInvestorRepayment(investorName: string, amount: string) {
  return createNotification({
    type: 'INVESTOR_REPAYMENT',
    title: `Investor repayment recorded`,
    body: `GHS ${amount} repaid to ${investorName}.`,
    metadata: { investorName, amount },
  });
}
