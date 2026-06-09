/**
 * GET /api/export/[report]
 *
 * Downloads a CSV report. Supported report slugs:
 *   portfolio, loans, loan-schedule, borrowers, investors,
 *   contributions, cycles, audit, ledger, engines, dashboard-snapshot
 */
import { loadPlatformState } from '@/lib/data/queries';
import {
  buildCsv,
  csvResponse,
  portfolioColumns,
  loanColumns,
  scheduleColumns,
  borrowerColumns,
  investorColumns,
  contributionColumns,
  cycleColumns,
  auditColumns,
  ledgerColumns,
  engineColumns,
} from '@/lib/exports/csv';
import { getOverview, getStressResults } from '@/lib/platform/selectors';

const VALID_REPORTS = new Set([
  'portfolio',
  'loans',
  'loan-schedule',
  'borrowers',
  'investors',
  'contributions',
  'cycles',
  'audit',
  'ledger',
  'engines',
  'dashboard-snapshot',
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const { report } = await params;

  if (!VALID_REPORTS.has(report)) {
    return Response.json({ error: `Unknown report: ${report}` }, { status: 400 });
  }

  const state = await loadPlatformState();
  const today = new Date().toISOString().slice(0, 10);

  switch (report) {
    case 'portfolio':
      return csvResponse(
        buildCsv(portfolioColumns, state.marketHoldings),
        `lejcapital-portfolio-${today}.csv`,
      );

    case 'loans':
      return csvResponse(
        buildCsv(loanColumns, state.loans),
        `lejcapital-loan-book-${today}.csv`,
      );

    case 'loan-schedule':
      return csvResponse(
        buildCsv(scheduleColumns, state.loanSchedules),
        `lejcapital-loan-schedule-${today}.csv`,
      );

    case 'borrowers':
      return csvResponse(
        buildCsv(borrowerColumns, state.borrowers),
        `lejcapital-borrowers-${today}.csv`,
      );

    case 'investors':
      return csvResponse(
        buildCsv(investorColumns, state.investors),
        `lejcapital-investors-${today}.csv`,
      );

    case 'contributions':
      return csvResponse(
        buildCsv(contributionColumns, state.contributions),
        `lejcapital-contributions-${today}.csv`,
      );

    case 'cycles':
      return csvResponse(
        buildCsv(cycleColumns, state.cycles),
        `lejcapital-cycles-${today}.csv`,
      );

    case 'audit':
      return csvResponse(
        buildCsv(auditColumns, state.auditEntries),
        `lejcapital-audit-trail-${today}.csv`,
      );

    case 'ledger':
      return csvResponse(
        buildCsv(ledgerColumns, state.ledgerEntries),
        `lejcapital-ledger-${today}.csv`,
      );

    case 'engines':
      return csvResponse(
        buildCsv(engineColumns, state.engineRecords),
        `lejcapital-engines-${today}.csv`,
      );

    case 'dashboard-snapshot': {
      const overview = getOverview(state);
      const stressResults = getStressResults(state);

      // Dashboard snapshot = summary KPIs + stress matrix in one CSV
      const lines: string[] = [];
      lines.push('LEJ Capital — Dashboard Snapshot');
      lines.push(`Generated,${today}`);
      lines.push('');
      lines.push('Metric,Value');
      lines.push(`Active Cycle,Cycle ${overview.activeCycle.sequenceNo}`);
      lines.push(`Cycle Status,${overview.activeCycle.status}`);
      lines.push(`Current NAV,${overview.currentNAV.toFixed(2)}`);
      lines.push(`Investor Principal Due,${overview.investorPrincipalDue.toFixed(2)}`);
      lines.push(`PCR,${overview.pcr.pcr.toFixed(4)}`);
      lines.push(`PCR Status,${overview.pcr.status}`);
      lines.push(`Risk Breaches,${overview.riskBreaches}`);
      lines.push(`Net Loan Book Value,${overview.loanMetrics.netValue.toFixed(2)}`);
      lines.push(`Total Provisions,${overview.loanMetrics.totalProvisions.toFixed(2)}`);
      lines.push(`Market Portfolio Value,${overview.marketPolicy.currentValues.total.toFixed(2)}`);
      lines.push('');
      lines.push('Stress Scenarios');
      lines.push('Scenario,PCR,Principal Covered,NAV Impact');
      for (const s of stressResults) {
        lines.push(
          `${s.label},${s.pcr.toFixed(4)},${s.principalCovered ? 'Yes' : 'No'},${s.navImpact.toFixed(2)}`,
        );
      }

      return csvResponse(lines.join('\n'), `lejcapital-dashboard-snapshot-${today}.csv`);
    }

    default:
      return Response.json({ error: 'Not implemented' }, { status: 501 });
  }
}
