/**
 * GET /api/export/[report]
 *
 * Downloads a CSV report. Supported report slugs:
 *   portfolio, loans, loan-schedule, borrowers, investors,
 *   contributions, cycles, audit, ledger, engines, audit-pack, dashboard-snapshot,
 *   dashboard-snapshot-pdf
 */
import { loadPlatformState } from '@/lib/data/queries';
import { getCurrentUser, type CurrentUser } from '@/lib/auth/server';
import { canAccessRoute } from '@/lib/auth/roles';
import { findInvestorByEmail } from '@/lib/fund/investor-lookup';
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
import { getOverview, getStressResults, getInvestorStatements, getActiveCycle, money } from '@/lib/platform/selectors';

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
  'audit-pack',
  'dashboard-snapshot',
  'dashboard-snapshot-pdf',
  'investor-statement-pdf',
]);

function sectionCsv(title: string, csv: string): string {
  return [`# ${title}`, csv].join('\n');
}

function escapePdfText(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function pdfResponse(lines: string[], filename: string): Response {
  const content = [
    'BT',
    '/F1 16 Tf',
    '50 780 Td',
    `(${escapePdfText(lines[0] ?? 'LEJ Capital Management')}) Tj`,
    '/F1 10 Tf',
    ...lines.slice(1).flatMap((line) => ['0 -18 Td', `(${escapePdfText(line)}) Tj`]),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Response(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const { report } = await params;

  if (!VALID_REPORTS.has(report)) {
    return Response.json({ error: `Unknown report: ${report}` }, { status: 400 });
  }

  // Role-based access check for export routes
  let user: CurrentUser;
  try {
    user = await getCurrentUser();
    const exportPath = `/api/export/${report}`;
    if (!canAccessRoute(user.role, exportPath)) {
      return Response.json({ error: 'Access denied.' }, { status: 403 });
    }
  } catch {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
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
        `lejcapital-capital-partners-${today}.csv`,
      );

    case 'contributions': {
      // Scope to logged-in investor when role is INVESTOR
      const scopedContributions = user.role === 'INVESTOR'
        ? (() => {
            const inv = findInvestorByEmail(state.investors, user.email);
            return inv ? state.contributions.filter((c) => c.investorId === inv.id) : [];
          })()
        : state.contributions;
      return csvResponse(
        buildCsv(contributionColumns, scopedContributions),
        `lejcapital-contributions-${today}.csv`,
      );
    }

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

    case 'audit-pack': {
      const overview = getOverview(state);
      const stressResults = getStressResults(state);
      const summary = [
        'Metric,Value',
        `Generated,${today}`,
        `Active Cycle,Cycle ${overview.activeCycle.sequenceNo}`,
        `Cycle Status,${overview.activeCycle.status}`,
        `Current NAV,${overview.currentNAV.toFixed(2)}`,
        `PCR,${overview.pcr.pcr.toFixed(4)}`,
        `PCR Status,${overview.pcr.status}`,
        `Liquid Assets,${overview.pcr.liquidAssets.toFixed(2)}`,
        `Capital Principal Due,${overview.investorPrincipalDue.toFixed(2)}`,
        `Loan Book Outstanding,${overview.loanMetrics.totalOutstanding.toFixed(2)}`,
        `Loan Book Net Value,${overview.loanMetrics.netValue.toFixed(2)}`,
        `PAR 30,${overview.loanMetrics.par30.toFixed(6)}`,
        `PAR 90,${overview.loanMetrics.par90.toFixed(6)}`,
        `Risk Breaches,${overview.riskBreaches}`,
      ].join('\n');
      const stress = [
        'Scenario,PCR,Principal Covered,NAV Impact',
        ...stressResults.map((s) => `${s.label},${s.pcr.toFixed(4)},${s.principalCovered ? 'Yes' : 'No'},${s.navImpact.toFixed(2)}`),
      ].join('\n');
      const pack = [
        sectionCsv('Executive Summary', summary),
        sectionCsv('Cycles', buildCsv(cycleColumns, state.cycles)),
        sectionCsv('Sleeves', buildCsv([
          { header: 'Cycle ID', value: (row: { cycleId: string; type: string; targetAmount: string; fundedAmount: string; floorAmount: string; notes: string }) => row.cycleId },
          { header: 'Sleeve', value: (row) => row.type },
          { header: 'Target Amount', value: (row) => row.targetAmount },
          { header: 'Funded Amount', value: (row) => row.fundedAmount },
          { header: 'Floor Amount', value: (row) => row.floorAmount },
          { header: 'Notes', value: (row) => row.notes },
        ], Object.entries(state.sleevesByCycle).flatMap(([cycleId, sleeves]) =>
          sleeves.map((sleeve) => ({
            cycleId,
            type: sleeve.type,
            targetAmount: sleeve.targetAmount?.toFixed(2) ?? 'TBC',
            fundedAmount: sleeve.fundedAmount.toFixed(2),
            floorAmount: sleeve.floorAmount?.toFixed(2) ?? 'TBC',
            notes: sleeve.notes,
          })),
        ))),
        sectionCsv('Investors', buildCsv(investorColumns, state.investors)),
        sectionCsv('Contributions', buildCsv(contributionColumns, state.contributions)),
        sectionCsv('Ledger', buildCsv(ledgerColumns, state.ledgerEntries)),
        sectionCsv('Market Holdings', buildCsv(portfolioColumns, state.marketHoldings)),
        sectionCsv('Borrowers', buildCsv(borrowerColumns, state.borrowers)),
        sectionCsv('Loans', buildCsv(loanColumns, state.loans)),
        sectionCsv('Loan Schedule', buildCsv(scheduleColumns, state.loanSchedules)),
        sectionCsv('Operating Businesses', buildCsv(engineColumns, state.engineRecords)),
        sectionCsv('Stress Tests', stress),
        sectionCsv('Audit Trail', buildCsv(auditColumns, state.auditEntries)),
      ].join('\n\n');

      return csvResponse(pack, `lejcapital-ai-audit-pack-${today}.csv`);
    }

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
      lines.push(`Capital Principal Due,${overview.investorPrincipalDue.toFixed(2)}`);
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

    case 'dashboard-snapshot-pdf': {
      const overview = getOverview(state);
      const stressResults = getStressResults(state);
      const lines = [
        'LEJ Capital Management - Dashboard Snapshot',
        `Generated: ${today}`,
        `Active Cycle: Cycle ${overview.activeCycle.sequenceNo}`,
        `Cycle Status: ${overview.activeCycle.status}`,
        `Current NAV: GHS ${overview.currentNAV.toFixed(2)}`,
        `Capital Principal Due: GHS ${overview.investorPrincipalDue.toFixed(2)}`,
        `PCR: ${overview.pcr.pcr.toFixed(4)} (${overview.pcr.status})`,
        `Risk Breaches: ${overview.riskBreaches}`,
        `Net Loan Book Value: GHS ${overview.loanMetrics.netValue.toFixed(2)}`,
        `Total Provisions: GHS ${overview.loanMetrics.totalProvisions.toFixed(2)}`,
        `Market Portfolio Value: GHS ${overview.marketPolicy.currentValues.total.toFixed(2)}`,
        '',
        'Stress Scenarios',
        ...stressResults.slice(0, 16).map((s) => `${s.label}: PCR ${s.pcr.toFixed(4)}, ${s.principalCovered ? 'covered' : 'not covered'}, NAV impact ${s.navImpact.toFixed(2)}`),
      ];
      return pdfResponse(lines, `lejcapital-dashboard-snapshot-${today}.pdf`);
    }

    case 'investor-statement-pdf': {
      const allStatements = getInvestorStatements(state);
      const activeCycle = getActiveCycle(state);

      // Scope to logged-in investor when role is INVESTOR
      const isInvestorRole = user.role === 'INVESTOR';
      const matchedInvestor = isInvestorRole
        ? findInvestorByEmail(state.investors, user.email)
        : null;
      if (isInvestorRole && !matchedInvestor) {
        return Response.json({ error: 'No capital partner record linked to your account.' }, { status: 403 });
      }
      const statements = matchedInvestor
        ? allStatements.filter((s) => s.investor.id === matchedInvestor.id)
        : allStatements;

      const allLines: string[] = [
        'LEJ Capital Management - Capital Statement',
        `Generated: ${today}`,
        `Active Cycle: Cycle ${activeCycle.sequenceNo} (${activeCycle.status})`,
        `Period: ${activeCycle.startDate} to ${activeCycle.endDate}`,
        '',
      ];

      for (const stmt of statements) {
        allLines.push(`--- ${stmt.investor.name} ---`);
        allLines.push(`Contact: ${stmt.investor.contact || 'N/A'}`);
        allLines.push(`Total Contributed: ${money(stmt.totalContributed)}`);
        allLines.push(`Total Repaid: ${money(stmt.totalRepaid)}`);
        allLines.push(`Outstanding: ${money(stmt.totalContributed.minus(stmt.totalRepaid))}`);
        allLines.push(`Status: ${stmt.totalRepaid.gte(stmt.totalContributed) ? 'Fully Repaid' : 'Active'}`);
        allLines.push('');

        const investorContributions = state.contributions.filter((c) => c.investorId === stmt.investor.id);
        if (investorContributions.length > 0) {
          allLines.push('Contributions:');
          for (const c of investorContributions) {
            const cycle = state.cycles.find((cy) => cy.id === c.cycleId);
            allLines.push(`  ${c.dateReceived} - ${cycle ? `Cycle ${cycle.sequenceNo}` : c.cycleId} - ${money(c.amount)}`);
          }
          allLines.push('');
        }

        const investorRepayments = state.repayments.filter((r) => r.investorId === stmt.investor.id);
        if (investorRepayments.length > 0) {
          allLines.push('Repayments:');
          for (const r of investorRepayments) {
            const cycle = state.cycles.find((cy) => cy.id === r.cycleId);
            allLines.push(`  ${r.repaymentDate} - ${cycle ? `Cycle ${cycle.sequenceNo}` : r.cycleId} - ${money(r.amountRepaid)}`);
          }
          allLines.push('');
        }
      }

      allLines.push('---');
      allLines.push('CONFIDENTIAL - For authorised internal use only.');

      return pdfResponse(allLines.slice(0, 40), `lejcapital-capital-statement-${today}.pdf`);
    }

    default:
      return Response.json({ error: 'Not implemented' }, { status: 501 });
  }
}
