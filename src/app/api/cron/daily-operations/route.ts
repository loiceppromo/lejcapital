/**
 * Daily operations cadence.
 *
 * Vercel Cron calls this endpoint each morning. It creates deduplicated in-app
 * notifications and, when Resend is configured, emails a concise brief to fund
 * managers. It never contacts borrowers automatically: borrower communication
 * requires a recorded consent/workflow before a provider can be enabled.
 */
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { loadPlatformState } from '@/lib/data/queries';
import { sendDailyOperatingBrief, isEmailConfigured } from '@/lib/email/service';
import { getActiveCycle, getLoanMetrics } from '@/lib/platform/selectors';
import { getCapitalSignals } from '@/lib/platform/signals';
import { sendBorrowerLoanEmail } from '@/lib/email/service';
import { isWhatsAppConfigured, sendWhatsAppMessage } from '@/lib/whatsapp/service';

export const dynamic = 'force-dynamic';

function todayAccra() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Accra', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get('authorization') === `Bearer ${secret}`;
  // Do not expose an operational write endpoint when production has not been
  // configured with a secret. Local development remains convenient.
  return process.env.VERCEL_ENV !== 'production';
}

export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ error: 'Cron authentication is not configured.' }, { status: 401 });
  if (!isDatabaseConfigured()) return Response.json({ ok: true, mode: 'seed', notifications: 0, emails: 0 });

  const state = await loadPlatformState();
  const db = await getDb();
  const date = todayAccra();
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const pendingApprovals = await db.allocationDecision.count({ where: { status: { in: ['PENDING', 'DRAFT'] } } });
  const alerts = getCapitalSignals(state, { pendingApprovals });
  const cycle = getActiveCycle(state);
  const loans = getLoanMetrics(state);
  const daysToCycleClose = Math.ceil((new Date(cycle.endDate).getTime() - Date.now()) / 86_400_000);

  if (daysToCycleClose >= 0 && daysToCycleClose <= 7) {
    alerts.push({ id: 'cycle-close', severity: 'ACTION', title: 'Prepare cycle close', detail: `Cycle ${cycle.sequenceNo} closes in ${daysToCycleClose} day${daysToCycleClose === 1 ? '' : 's'}. Reconcile cash, provisions, and capital obligations.`, href: '/cycles', cta: 'Review' });
  }
  const delinquent = loans.summaries.filter((loan) => loan.maxDaysPastDue > 0);
  if (delinquent.length > 0) {
    alerts.push({ id: 'loan-delinquency', severity: delinquent.some((loan) => loan.maxDaysPastDue >= 90) ? 'CRITICAL' : 'ACTION', title: 'Review loan collections', detail: `${delinquent.length} loan${delinquent.length === 1 ? '' : 's'} have overdue scheduled payments.`, href: '/loans', cta: 'Review' });
  }

  let created = 0;
  for (const alert of alerts) {
    const title = `[${date}] ${alert.title}`;
    const exists = await db.notification.findFirst({ where: { type: 'SYSTEM_ALERT', title, createdAt: { gte: dayStart } }, select: { id: true } });
    if (exists) continue;
    await db.notification.create({ data: { type: 'SYSTEM_ALERT', channel: 'IN_APP', title, body: alert.detail, metadata: { signalId: alert.id, href: alert.href, cta: alert.cta } } });
    created += 1;
  }

  let emails = 0;
  if (isEmailConfigured()) {
    const managers = await db.user.findMany({ where: { role: 'FUND_MANAGER', active: true }, select: { email: true } });
    for (const manager of managers) {
      const result = await sendDailyOperatingBrief(manager.email, { date, items: alerts.map((alert) => `${alert.title}: ${alert.detail}`) });
      if (result.ok) emails += 1;
    }
  }

  // Automated borrower notices are deliberately consent-gated. A recorded
  // borrower consent flag avoids treating contact details as permission.
  let borrowerMessages = 0;
  const reminderWindow = new Date();
  reminderWindow.setDate(reminderWindow.getDate() + 3);
  const scheduleItems = await db.loanScheduleItem.findMany({
    where: { status: { in: ['SCHEDULED', 'PARTIAL', 'OVERDUE'] }, dueDate: { lte: reminderWindow } },
    include: { loan: { include: { borrower: true } } },
  });
  for (const item of scheduleItems) {
    const borrower = item.loan.borrower;
    if (!borrower?.communicationConsent) continue;
    const paid = Number(item.amountPaid);
    const due = Number(item.totalDue);
    if (paid >= due) continue;
    const daysPastDue = Math.max(0, Math.floor((Date.now() - item.dueDate.getTime()) / 86_400_000));
    const kind = daysPastDue > 0 ? 'overdue' : 'upcoming';
    const key = `[${date}] borrower-${kind}-${item.id}`;
    const alreadySent = await db.auditLog.findFirst({ where: { action: 'AUTO_BORROWER_REMINDER', entityId: item.id, createdAt: { gte: dayStart } }, select: { id: true } });
    if (alreadySent) continue;
    const amount = `GHS ${(due - paid).toFixed(2)}`;
    const message = daysPastDue > 0
      ? `Hello ${borrower.name}, your LEJ Capital payment of ${amount} is ${daysPastDue} day(s) overdue. Please make payment or contact LEJ Capital to regularize the account.`
      : `Hello ${borrower.name}, a LEJ Capital payment of ${amount} is due on ${item.dueDate.toISOString().slice(0, 10)}. Please arrange payment and send proof for confirmation.`;
    let delivered = false;
    if (borrower.email && isEmailConfigured()) delivered = (await sendBorrowerLoanEmail(borrower.email, 'LEJ Capital loan payment reminder', message)).ok;
    if (borrower.phone && isWhatsAppConfigured()) delivered = (await sendWhatsAppMessage(borrower.phone, message)).ok || delivered;
    await db.auditLog.create({ data: { action: 'AUTO_BORROWER_REMINDER', entityType: 'LoanScheduleItem', entityId: item.id, after: { key, kind, amount, daysPastDue, delivered, consent: borrower.communicationConsentSource ?? 'recorded' } } });
    if (delivered) borrowerMessages += 1;
  }

  return Response.json({ ok: true, date, notifications: created, emails, borrowerMessages, alerts: alerts.length });
}
