'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateRecommendation, approveDecision, rejectDecision } from '@/app/actions/decisions';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { EmptyState } from '@/components/app/empty-state';
import { useToast } from '@/components/app/toast';
import type { CapitalSignal } from '@/lib/platform/signals';

const money = (n: number) => `GHS ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${(Number(n) * 100).toFixed(2)}%`;

interface Line { assetClass: string; label: string; amount: number; pct: number }
interface Strategy {
  key: string; name: string; lines: Line[]; expectedAnnualReturn: number; expectedReturnAmount: number;
  projectedLiquidity: number; projectedPcr: number; riskLevel: string; maxLockupDays: number;
  advantage: string; downside: string; confidence: number; eligible: boolean; constraintViolations: string[];
}
interface Recommendation {
  availableCapital: number; restricted: boolean; restrictionReason: string | null;
  strategies: Strategy[]; rationale: string[]; warnings: string[]; confidence: number;
  rejectedOpportunities: { id: string; label: string; reason: string }[];
  scored: { id: string; label: string; assetClass: string; score: number; eligible: boolean; rejectionReason: string | null }[];
}
export interface DecisionView {
  id: string; availableCapital: number; status: string; restricted: boolean; confidence: number | null;
  recommendation: Recommendation; approvedStrategy: string | null; approvedBy: string | null;
  modificationReason: string | null; riskOverride: boolean; createdAt: string; approvedAt: string | null;
}

const RISK_STATE: Record<string, 'GREEN' | 'WATCH' | 'BREACH' | 'NEUTRAL'> = {
  LOW: 'GREEN', MODERATE: 'WATCH', HIGH: 'BREACH', CRITICAL: 'BREACH',
};
const STATUS_STATE: Record<string, 'GREEN' | 'WATCH' | 'BREACH' | 'NEUTRAL'> = {
  PENDING: 'WATCH', APPROVED: 'GREEN', REJECTED: 'BREACH', EXECUTED: 'GREEN', DRAFT: 'NEUTRAL',
};

export function DecisionCentreClient({ decisions, signals, canApprove }: { decisions: DecisionView[]; signals: CapitalSignal[]; canApprove: boolean }) {
  const pending = decisions.filter((d) => d.status === 'PENDING' || d.status === 'DRAFT');
  const history = decisions.filter((d) => d.status !== 'PENDING' && d.status !== 'DRAFT');

  return (
    <div className="space-y-5">
      <SignalPanel signals={signals} />
      <AnalyseCard />
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-brand-black">Awaiting approval</h2>
        {pending.length === 0 ? (
          <SectionCard title="Nothing awaiting approval">
            <EmptyState title="No capital awaiting allocation" description="Record available capital above to generate a recommendation." />
          </SectionCard>
        ) : (
          pending.map((d) => <DecisionCard key={d.id} decision={d} canApprove={canApprove} />)
        )}
      </section>
      {history.length > 0 && <DecisionHistory decisions={history} />}
    </div>
  );
}

function SignalPanel({ signals }: { signals: CapitalSignal[] }) {
  if (signals.length === 0) return null;
  const tone: Record<CapitalSignal['severity'], string> = {
    CRITICAL: 'border-brand-danger/40 bg-red-50/60',
    ACTION: 'border-brand-warning/40 bg-amber-50/60',
    INFO: 'border-brand-line bg-brand-panel',
  };
  return (
    <SectionCard title="What needs a decision" description="Signals are generated from the current fund position. Nothing is executed automatically.">
      <div className="grid gap-2">
        {signals.slice(0, 4).map((signal) => (
          <a key={signal.id} href={signal.href} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-3 transition-colors hover:border-brand-accent ${tone[signal.severity]}`}>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-brand-black">{signal.title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-brand-muted">{signal.detail}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-brand-navy">{signal.cta}</span>
          </a>
        ))}
      </div>
    </SectionCard>
  );
}

function AnalyseCard() {
  const router = useRouter();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [pending, setPending] = useState(false);

  async function analyse() {
    const value = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0) { toast({ tone: 'error', title: 'Enter a positive amount' }); return; }
    setPending(true);
    const res = await generateRecommendation(value);
    setPending(false);
    if (res.ok) { setAmount(''); router.refresh(); toast({ tone: 'success', title: 'Recommendation ready', message: 'Review and approve below.' }); }
    else toast({ tone: 'error', title: 'Analysis failed', message: res.error ?? 'Unknown error' });
  }

  return (
    <SectionCard title="Allocate available capital" description="Enter available capital. LEJ analyses your position and recommends a deployment — it never executes.">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-brand-charcoal">Available capital (GHS)</label>
          <input
            inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
          />
        </div>
        <button onClick={analyse} disabled={pending}
          className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50">
          {pending ? 'Analysing…' : 'Analyse & recommend'}
        </button>
      </div>
    </SectionCard>
  );
}

function DecisionCard({ decision, canApprove }: { decision: DecisionView; canApprove: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const rec = decision.recommendation;
  const top = rec.strategies[0];

  async function approve(strategyKey: string) {
    setBusy(true);
    const res = await approveDecision(decision.id, strategyKey as never);
    setBusy(false);
    if (res.ok) { router.refresh(); toast({ tone: 'success', title: 'Approved — awaiting manual execution' }); }
    else toast({ tone: 'error', title: 'Could not approve', message: res.error ?? '' });
  }
  async function reject() {
    setBusy(true);
    const res = await rejectDecision(decision.id);
    setBusy(false);
    if (res.ok) { router.refresh(); toast({ tone: 'success', title: 'Recommendation rejected' }); }
    else toast({ tone: 'error', title: 'Could not reject', message: res.error ?? '' });
  }

  return (
    <SectionCard
      title={`Allocate ${money(decision.availableCapital)}`}
      description={rec.restricted ? 'Capital deployment restricted — principal coverage below the approved minimum.' : 'Capital available for deployment.'}
      action={<StatusBadge state={rec.restricted ? 'BREACH' : 'GREEN'}>{rec.restricted ? 'Restricted' : 'Eligible'}</StatusBadge>}
    >
      {/* Recommended strategy */}
      <div className="rounded-lg border border-brand-line bg-brand-panel p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-black">{top.name}</p>
          <div className="flex items-center gap-2">
            <StatusBadge state={RISK_STATE[top.riskLevel] ?? 'NEUTRAL'}>{top.riskLevel}</StatusBadge>
            <span className="text-xs text-brand-muted">{pct(top.confidence)} confidence</span>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {top.lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-brand-charcoal">{l.label}</span>
              <span className="font-mono">{money(l.amount)} <span className="text-brand-muted">({l.pct}%)</span></span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-brand-line pt-3 text-xs sm:grid-cols-4">
          <Metric label="Expected return" value={pct(top.expectedAnnualReturn)} />
          <Metric label="Projected liquidity" value={money(top.projectedLiquidity)} />
          <Metric label="Projected PCR" value={`${top.projectedPcr}x`} />
          <Metric label="Lock-up" value={`${top.maxLockupDays} days`} />
        </div>
      </div>

      {/* Why */}
      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">Why</p>
        <ul className="space-y-1 text-sm text-brand-charcoal">
          {rec.rationale.slice(0, 5).map((r, i) => <li key={i}>• {r}</li>)}
        </ul>
      </div>

      {rec.warnings.length > 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{rec.warnings[0]}</p>
      )}

      {/* Approval controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canApprove ? (
          <>
            <button onClick={() => approve('RECOMMENDED')} disabled={busy}
              className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50">
              Approve recommendation
            </button>
            <button onClick={reject} disabled={busy}
              className="rounded-md border border-brand-line bg-white px-3 py-2 text-sm font-semibold text-brand-charcoal hover:bg-brand-panel disabled:opacity-50">
              Reject
            </button>
          </>
        ) : (
          <span className="text-xs text-brand-muted">Approval requires Fund Manager permissions.</span>
        )}
        <button onClick={() => setShowAnalysis((s) => !s)}
          className="ml-auto text-xs font-semibold text-brand-navy hover:underline">
          {showAnalysis ? 'Hide full analysis' : 'View full analysis'}
        </button>
      </div>

      {/* Progressive disclosure */}
      {showAnalysis && (
        <div className="mt-4 space-y-4 border-t border-brand-line pt-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">Alternative strategies</p>
            <div className="space-y-2">
              {rec.strategies.slice(1).map((s) => (
                <div key={s.key} className="rounded-md border border-brand-line p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge state={s.eligible ? (RISK_STATE[s.riskLevel] ?? 'NEUTRAL') : 'BREACH'}>
                        {s.eligible ? s.riskLevel : 'Not eligible'}
                      </StatusBadge>
                      {canApprove && s.eligible && (
                        <button onClick={() => approve(s.key)} disabled={busy} className="text-xs font-semibold text-brand-navy hover:underline">Approve this</button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-brand-muted">
                    Return {pct(s.expectedAnnualReturn)} · liquidity {money(s.projectedLiquidity)} · PCR {s.projectedPcr}x
                  </p>
                  {!s.eligible && s.constraintViolations[0] && <p className="mt-1 text-xs text-red-600">{s.constraintViolations[0]}</p>}
                </div>
              ))}
            </div>
          </div>
          {rec.rejectedOpportunities.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">Opportunities rejected</p>
              <ul className="space-y-1 text-xs text-brand-muted">
                {rec.rejectedOpportunities.map((r) => <li key={r.id}>• {r.label}: {r.reason}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase text-brand-muted">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-brand-black">{value}</p>
    </div>
  );
}

function DecisionHistory({ decisions }: { decisions: DecisionView[] }) {
  return (
    <SectionCard title="Decision record" description="Approved, rejected and executed decisions — full audit trail.">
      <div className="divide-y divide-brand-line">
        {decisions.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-brand-black">{money(d.availableCapital)} · {d.recommendation.strategies[0]?.name}</p>
              <p className="truncate text-xs text-brand-muted">
                {new Date(d.createdAt).toLocaleDateString('en-GB')}
                {d.approvedBy ? ` · ${d.approvedStrategy} by ${d.approvedBy}` : ''}
                {d.riskOverride ? ' · risk override' : ''}
              </p>
            </div>
            <StatusBadge state={STATUS_STATE[d.status] ?? 'NEUTRAL'}>
              {d.status === 'APPROVED' ? 'Approved — awaiting execution' : d.status}
            </StatusBadge>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
