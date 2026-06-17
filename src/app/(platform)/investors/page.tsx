import type { Metadata } from 'next';
import { ActionDrawer } from '@/components/app/action-drawer';
import { DataTable } from '@/components/app/data-table';
import { InvestorActionsForm } from '@/components/app/investor-form';
import { KpiCard } from '@/components/app/kpi-card';
import { PageNav } from '@/components/app/page-nav';
import { PageHeader } from '@/components/app/page-header';
import { PresentationToggle } from '@/components/app/presentation-toggle';
import { PrintHeader } from '@/components/app/print-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { hasPersistedCycles, toCycleOptions } from '@/lib/platform/cycle-utils';
import { Decimal } from '@/lib/finance';
import { getInvestorPrincipalDue, getInvestorStatements, money } from '@/lib/platform/selectors';
import { guardPage } from '@/lib/auth/page-guard';
import { canAccess } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Capital Partners | LEJ Capital' };

function tierBadgeColor(tier: string) {
  switch (tier) {
    case 'ELITE': return 'GREEN';
    case 'EXECUTIVE': return 'GREEN';
    case 'PREMIUM': return 'WATCH';
    case 'GROWTH': return 'NEUTRAL';
    default: return 'NEUTRAL';
  }
}

function giftStatusColor(status: string) {
  switch (status) {
    case 'DELIVERED': return 'GREEN';
    case 'PACKED': return 'WATCH';
    case 'SELECTED': return 'WATCH';
    case 'DUE': return 'BREACH';
    default: return 'NEUTRAL';
  }
}

function formatTier(tier: string) {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export default async function InvestorsPage() {
  const { role } = await guardPage('/investors');
  const state = await loadPlatformState();
  const statements = getInvestorStatements(state);
  const totalContributed = statements.reduce((s, st) => s.plus(st.totalContributed), new Decimal(0));
  const totalRepaid = statements.reduce((s, st) => s.plus(st.totalRepaid), new Decimal(0));

  const investorOptions = state.investors.map((i) => ({ id: i.id, label: `${i.name} · ${i.status}` }));
  const cycleOptions = toCycleOptions(state);
  const hasCycles = hasPersistedCycles(state);

  const investorCycleOptions = state.investorCycles.map((ic) => {
    const inv = state.investors.find((i) => i.id === ic.investorId);
    return { id: ic.id, investorId: ic.investorId, label: `${inv?.name ?? 'Unknown'} — GHS ${Number(ic.investmentAmount).toLocaleString()} (${formatTier(ic.packageTier)})` };
  });

  // Aggregate investor cycle metrics
  const activeCycles = state.investorCycles.filter((ic) => ic.status === 'ACTIVE');
  const maturedCycles = state.investorCycles.filter((ic) => ic.status === 'MATURED');
  const totalActiveCapital = activeCycles.reduce((s, ic) => s.plus(ic.investmentAmount), new Decimal(0));
  const totalPreferredReturns = activeCycles.reduce((s, ic) => s.plus(ic.preferredReturn), new Decimal(0));
  const giftsDue = state.investorCycles.filter((ic) => ic.giftEligible && ic.giftStatus === 'DUE');
  const pendingReinvestment = maturedCycles.filter((ic) => !ic.reinvestmentConfirmed);

  return (
    <>
      <PrintHeader title="Capital Partners Report" subtitle={`${state.investors.length} partners · ${money(totalContributed)} capital placed`} />
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Capital' }]}
        title="Capital Partners"
        description="Capital contributions, cycle management, payouts, reinvestment, and gift tracking."
        action={
          <div className="flex gap-2">
            <PresentationToggle />
            {canAccess(role, 'ADD_INVESTOR') ? (
              <ActionDrawer label="Capital actions" title="Capital partner actions">
                <InvestorActionsForm investors={investorOptions} cycles={cycleOptions} investorCycles={investorCycleOptions} hasCycles={hasCycles} />
              </ActionDrawer>
            ) : null}
          </div>
        }
      />
      <PageNav items={[
        { id: 'investor-overview', label: 'Overview' },
        { id: 'investor-list', label: 'Partners' },
        { id: 'cycle-management', label: 'Cycles' },
        { id: 'gift-tracking', label: 'Gifts' },
        { id: 'documents', label: 'Documents' },
        { id: 'capital-movements', label: 'Movements' },
      ]} />

      {/* ── Section A: Overview KPIs ── */}
      <div id="investor-overview" className="kpi-scroll-row scroll-mt-24 grid gap-4 md:grid-cols-4 lg:grid-cols-5">
        <KpiCard label="Total partners" value={String(state.investors.length)} />
        <KpiCard label="Active capital" value={money(totalActiveCapital)} />
        <KpiCard label="Capital due" value={money(getInvestorPrincipalDue(state))} />
        <KpiCard label="Preferred returns due" value={money(totalPreferredReturns)} />
        <KpiCard label="Gifts due" value={String(giftsDue.length)} />
      </div>

      {/* ── Cycle-End Actions Alert ── */}
      {(maturedCycles.length > 0 || giftsDue.length > 0 || pendingReinvestment.length > 0) && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">Cycle-end actions required</p>
          <ul className="space-y-1 text-xs text-amber-700">
            {maturedCycles.length > 0 && <li>• {maturedCycles.length} capital cycle(s) matured — awaiting payout decision</li>}
            {pendingReinvestment.length > 0 && <li>• {pendingReinvestment.length} partner(s) waiting for reinvestment confirmation</li>}
            {giftsDue.length > 0 && <li>• {giftsDue.length} gift(s) due for eligible partners</li>}
            {state.investorCycles.filter((ic) => ic.status === 'ACTIVE' && !ic.agreementUploaded).length > 0 && (
              <li>• {state.investorCycles.filter((ic) => ic.status === 'ACTIVE' && !ic.agreementUploaded).length} partner(s) missing signed agreement</li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        {/* ── Section B: Investor List with Package Info ── */}
        <div id="investor-list" className="scroll-mt-24">
          <SectionCard title="Capital partners" description="Registered partners, packages, and current standing.">
            <DataTable
              headers={['Partner', 'Contact', 'Status', 'Active capital']}
              rows={state.investors.map((investor) => {
                const activeIC = state.investorCycles.find((ic) => ic.investorId === investor.id && ic.status === 'ACTIVE');
                return [
                  <span key="name" className="font-medium">{investor.name}</span>,
                  <span key="contact" className="text-brand-muted">{investor.contact || 'TBC'}</span>,
                  <StatusBadge key="status" state={investor.status === 'ACTIVE' ? 'GREEN' : 'NEUTRAL'}>{investor.status}</StatusBadge>,
                  activeIC ? (
                    <span key="investment" className="font-mono text-xs">
                      GHS {Number(activeIC.investmentAmount).toLocaleString()} · <StatusBadge state={tierBadgeColor(activeIC.packageTier)}>{formatTier(activeIC.packageTier)}</StatusBadge>
                    </span>
                  ) : <span key="investment" className="text-brand-muted text-xs">No active cycle</span>,
                ];
              })}
            />
          </SectionCard>
        </div>

        {/* ── Section C: Statements ── */}
        <div className="scroll-mt-24">
          <SectionCard title="Partner statements" description={`Total capital returned: ${money(totalRepaid)}.`}>
            <DataTable
              headers={['Partner', 'Capital placed', 'Returned', 'Standing']}
              rows={statements.map((st) => [
                <span key="name" className="font-medium">{st.investor.name}</span>,
                <span key="contributed" className="font-mono">{money(st.totalContributed)}</span>,
                <span key="repaid" className="font-mono">{money(st.totalRepaid)}</span>,
                <span key="standing" className="font-mono font-semibold">{money(st.currentStanding)}</span>,
              ])}
            />
          </SectionCard>
        </div>
      </div>

      {/* ── Section D: Cycle Management ── */}
      <div id="cycle-management" className="mt-5 scroll-mt-24">
        <SectionCard title="Cycle management" description="Active and completed capital cycles with package details.">
          {state.investorCycles.length === 0 ? (
            <p className="py-6 text-center text-sm text-brand-muted">No capital cycles recorded yet. Add a capital partner with a contribution amount to create the first cycle.</p>
          ) : (
            <DataTable
              headers={['Partner', 'Package', 'Capital placed', 'Preferred return', 'Final payout', 'Cycle', 'Status', 'Payout preference']}
              rows={state.investorCycles.map((ic) => {
                const inv = state.investors.find((i) => i.id === ic.investorId);
                const cycle = state.cycles.find((c) => c.id === ic.cycleId);
                return [
                  <span key="name" className="font-medium">{inv?.name ?? 'Unknown'}</span>,
                  <StatusBadge key="tier" state={tierBadgeColor(ic.packageTier)}>{formatTier(ic.packageTier)} · {(Number(ic.cycleReturnRate) * 100).toFixed(1)}%</StatusBadge>,
                  <span key="investment" className="font-mono">GHS {Number(ic.investmentAmount).toLocaleString()}</span>,
                  <span key="return" className="font-mono text-green-700">GHS {Number(ic.preferredReturn).toLocaleString()}</span>,
                  <span key="payout" className="font-mono font-semibold">GHS {(Number(ic.investmentAmount) + Number(ic.preferredReturn)).toLocaleString()}</span>,
                  <span key="cycle" className="text-xs">{cycle ? `Cycle ${cycle.sequenceNo}` : 'TBC'} · {ic.cycleStartDate} → {ic.cycleEndDate}</span>,
                  <StatusBadge key="status" state={ic.status === 'ACTIVE' ? 'GREEN' : ic.status === 'MATURED' ? 'WATCH' : 'NEUTRAL'}>{ic.status}</StatusBadge>,
                  <span key="pref" className="text-xs text-brand-muted">{ic.payoutPreference ? ic.payoutPreference.replace(/_/g, ' ').toLowerCase() : '—'}</span>,
                ];
              })}
            />
          )}
        </SectionCard>
      </div>

      {/* ── Section E: Gift Tracking ── */}
      <div id="gift-tracking" className="mt-5 scroll-mt-24">
        <SectionCard title="Gift tracking" description="Seasonal gifts for eligible capital partners (GHS 10,000+).">
          {state.investorCycles.filter((ic) => ic.giftEligible).length === 0 ? (
            <p className="py-6 text-center text-sm text-brand-muted">No gift-eligible partners yet.</p>
          ) : (
            <DataTable
              headers={['Partner', 'Gift tier', 'Status', 'Gift selected', 'Delivery date', 'Notes']}
              rows={state.investorCycles.filter((ic) => ic.giftEligible).map((ic) => {
                const inv = state.investors.find((i) => i.id === ic.investorId);
                return [
                  <span key="name" className="font-medium">{inv?.name ?? 'Unknown'}</span>,
                  <StatusBadge key="tier" state={tierBadgeColor(ic.giftTier)}>{formatTier(ic.giftTier)}</StatusBadge>,
                  <StatusBadge key="status" state={giftStatusColor(ic.giftStatus)}>{ic.giftStatus.replace(/_/g, ' ')}</StatusBadge>,
                  <span key="selected" className="text-xs">{ic.giftSelected ?? '—'}</span>,
                  <span key="date" className="text-xs font-mono">{ic.giftDeliveryDate ?? '—'}</span>,
                  <span key="notes" className="text-xs text-brand-muted">{ic.giftNotes ?? '—'}</span>,
                ];
              })}
            />
          )}
        </SectionCard>
      </div>

      {/* ── Section F: Documents ── */}
      <div id="documents" className="mt-5 scroll-mt-24">
        <SectionCard title="Partner documents" description="Agreement, risk acknowledgement, and proof of payment status.">
          {state.investorCycles.length === 0 ? (
            <p className="py-6 text-center text-sm text-brand-muted">No capital cycles to track documents for.</p>
          ) : (
            <DataTable
              headers={['Partner', 'Cycle', 'Agreement', 'Risk ack.', 'Proof of payment', 'Doc notes']}
              rows={state.investorCycles.map((ic) => {
                const inv = state.investors.find((i) => i.id === ic.investorId);
                const cycle = state.cycles.find((c) => c.id === ic.cycleId);
                return [
                  <span key="name" className="font-medium">{inv?.name ?? 'Unknown'}</span>,
                  <span key="cycle" className="text-xs">{cycle ? `Cycle ${cycle.sequenceNo}` : 'TBC'}</span>,
                  <StatusBadge key="agreement" state={ic.agreementUploaded ? 'GREEN' : 'BREACH'}>{ic.agreementUploaded ? 'Uploaded' : 'Missing'}</StatusBadge>,
                  <StatusBadge key="risk" state={ic.riskAckSigned ? 'GREEN' : 'BREACH'}>{ic.riskAckSigned ? 'Signed' : 'Missing'}</StatusBadge>,
                  <StatusBadge key="pop" state={ic.proofOfPayment ? 'GREEN' : 'BREACH'}>{ic.proofOfPayment ? 'Uploaded' : 'Missing'}</StatusBadge>,
                  <span key="notes" className="text-xs text-brand-muted">{ic.documentNotes ?? '—'}</span>,
                ];
              })}
            />
          )}
        </SectionCard>
      </div>

      {/* ── Section G: Capital Movements ── */}
      <div id="capital-movements" className="mt-5 scroll-mt-24">
        <SectionCard title="Capital movements" description="Append-only record of capital placed and returned by cycle.">
          <DataTable
            headers={['Type', 'Partner', 'Cycle', 'Amount', 'Date']}
            rows={[
              ...state.contributions.map((entry) => [
                <StatusBadge key="type" state="GREEN">Capital placed</StatusBadge>,
                state.investors.find((i) => i.id === entry.investorId)?.name ?? 'TBC',
                <span key="cycle" className="font-mono text-xs text-brand-muted">
                  {state.cycles.find((c) => c.id === entry.cycleId)?.sequenceNo ? `Cycle ${state.cycles.find((c) => c.id === entry.cycleId)?.sequenceNo}` : entry.cycleId.slice(0, 8)}
                </span>,
                <span key="amount" className="font-mono">{money(entry.amount)}</span>,
                entry.dateReceived,
              ]),
              ...state.repayments.map((entry) => [
                <StatusBadge key="type" state="NEUTRAL">Capital returned</StatusBadge>,
                state.investors.find((i) => i.id === entry.investorId)?.name ?? 'TBC',
                <span key="cycle" className="font-mono text-xs text-brand-muted">
                  {state.cycles.find((c) => c.id === entry.cycleId)?.sequenceNo ? `Cycle ${state.cycles.find((c) => c.id === entry.cycleId)?.sequenceNo}` : entry.cycleId.slice(0, 8)}
                </span>,
                <span key="amount" className="font-mono">{money(entry.amountRepaid)}</span>,
                entry.repaymentDate,
              ]),
            ]}
          />
        </SectionCard>
      </div>
    </>
  );
}
