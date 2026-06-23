/**
 * GET /api/cron/monthly-report
 *
 * Scheduled endpoint for automated monthly reports.
 * Intended to be called by Vercel Cron or an external scheduler.
 *
 * Security: Requires CRON_SECRET header to match env var.
 *
 * What it does:
 * 1. Loads current platform state
 * 2. Captures a dashboard snapshot
 * 3. Emails the monthly report to all fund managers
 */
import { loadPlatformState } from '@/lib/data/queries';
import { getOverview } from '@/lib/platform/selectors';
import { isDatabaseConfigured, getDb } from '@/lib/db';
import { sendMonthlyReport, isEmailConfigured } from '@/lib/email/service';
import { Decimal } from '@/lib/finance';
import { isAuthorizedCronRequest } from '@/lib/server/cron-auth';

export const dynamic = 'force-dynamic';

function money(value: Decimal | null): string {
  return value ? `GHS ${value.toNumber().toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'TBC';
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), {
    cronSecret: process.env.CRON_SECRET,
    vercelEnvironment: process.env.VERCEL_ENV,
  })) {
    return Response.json({ error: 'Cron authentication is not configured.' }, { status: 401 });
  }

  try {
    const state = await loadPlatformState();
    const overview = getOverview(state);
    const today = new Date().toISOString().slice(0, 10);

    // Capture snapshot to DB if configured
    if (isDatabaseConfigured()) {
      try {
        const db = await getDb();
        await db.reportSnapshot.create({
          data: {
            cycleId: overview.activeCycle.id,
            label: `auto-${today}`,
            snapshotDate: today,
            data: {
              activeCycle: `Cycle ${overview.activeCycle.sequenceNo}`,
              cycleStatus: overview.activeCycle.status,
              currentNAV: overview.currentNAV?.toString() ?? 'TBC',
              pcr: overview.pcr.pcr.toFixed(2),
              pcrStatus: overview.pcr.status,
              investorPrincipalDue: overview.investorPrincipalDue?.toString() ?? 'TBC',
              netLoanBookValue: overview.loanMetrics.netValue?.toString() ?? 'TBC',
              totalProvisions: overview.loanMetrics.totalProvisions?.toString() ?? 'TBC',
              marketPortfolioValue: overview.marketPolicy.currentValues.total?.toString() ?? 'TBC',
              riskBreaches: overview.riskBreaches,
            },
          },
        });
      } catch (err) {
        console.error('[CRON] Failed to save snapshot:', err);
      }
    }

    // Send email reports to fund managers
    const emailsSent: string[] = [];
    if (isEmailConfigured() && isDatabaseConfigured()) {
      try {
        const db = await getDb();
        const managers = await db.user.findMany({
          where: { role: 'FUND_MANAGER', active: true },
          select: { email: true },
        });

        for (const manager of managers) {
          const result = await sendMonthlyReport(manager.email, {
            date: today,
            nav: money(overview.currentNAV),
            pcr: `${overview.pcr.pcr.toFixed(2)}x`,
            pcrStatus: overview.pcr.status,
            totalInvestors: state.investors.length,
            riskBreaches: overview.riskBreaches,
          });
          if (result.ok) emailsSent.push(manager.email);
        }
      } catch (err) {
        console.error('[CRON] Failed to send emails:', err);
      }
    }

    return Response.json({
      ok: true,
      date: today,
      snapshot: {
        nav: money(overview.currentNAV),
        pcr: `${overview.pcr.pcr.toFixed(2)}x`,
        pcrStatus: overview.pcr.status,
        riskBreaches: overview.riskBreaches,
      },
      emailsSent: emailsSent.length,
    });
  } catch (err) {
    console.error('[CRON] Monthly report failed:', err);
    return Response.json({ error: 'Report generation failed' }, { status: 500 });
  }
}
