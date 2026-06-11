'use client';

import { useMemo, useState } from 'react';
import { computeRecommendedRate, Decimal, type RiskGrade } from '@/lib/finance';
import type { LoanPricingContext } from '@/lib/platform/types';
import { KpiCard } from './kpi-card';
import { SectionCard } from './section-card';
import { StatusBadge } from './status-badge';

type InterestMethod = 'FLAT' | 'REDUCING_BALANCE';

interface ScheduleRow {
  period: number;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  outstandingAfter: number;
}

function generateCalcSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  method: InterestMethod,
): ScheduleRow[] {
  if (principal <= 0 || annualRate < 0 || termMonths <= 0) return [];
  const rows: ScheduleRow[] = [];

  if (method === 'FLAT') {
    const totalInterest = principal * annualRate * (termMonths / 12);
    const monthlyPrincipal = principal / termMonths;
    const monthlyInterest = totalInterest / termMonths;
    let outstanding = principal;
    for (let i = 1; i <= termMonths; i++) {
      outstanding -= monthlyPrincipal;
      rows.push({
        period: i,
        principalDue: monthlyPrincipal,
        interestDue: monthlyInterest,
        totalDue: monthlyPrincipal + monthlyInterest,
        outstandingAfter: Math.max(0, outstanding),
      });
    }
  } else {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) {
      const monthly = principal / termMonths;
      let outstanding = principal;
      for (let i = 1; i <= termMonths; i++) {
        outstanding -= monthly;
        rows.push({ period: i, principalDue: monthly, interestDue: 0, totalDue: monthly, outstandingAfter: Math.max(0, outstanding) });
      }
    } else {
      const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
      let outstanding = principal;
      for (let i = 1; i <= termMonths; i++) {
        const interestDue = outstanding * monthlyRate;
        const principalDue = emi - interestDue;
        outstanding -= principalDue;
        rows.push({ period: i, principalDue, interestDue, totalDue: emi, outstandingAfter: Math.max(0, outstanding) });
      }
    }
  }
  return rows;
}

function getProvisionRate(daysPastDue: number): number {
  if (daysPastDue <= 0) return 0.01;
  if (daysPastDue <= 30) return 0.01;
  if (daysPastDue <= 60) return 0.10;
  if (daysPastDue <= 90) return 0.10;
  if (daysPastDue <= 180) return 0.25;
  if (daysPastDue <= 360) return 0.50;
  return 1.00;
}

function money(value: number): string {
  return `GHS ${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDecMoney(value: Decimal): string {
  return `GHS ${value.toNumber().toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LoanCalculator({ pricingContext }: { pricingContext?: LoanPricingContext }) {
  const [principal, setPrincipal] = useState(20000);
  const [annualRate, setAnnualRate] = useState(30);
  const [termMonths, setTermMonths] = useState(6);
  const [method, setMethod] = useState<InterestMethod>('REDUCING_BALANCE');
  const [originationFee, setOriginationFee] = useState(2.5);
  const [defaultScenarioDays, setDefaultScenarioDays] = useState(0);
  const [riskGrade, setRiskGrade] = useState<RiskGrade>('C');

  // Smart rate recommendation
  const pricing = useMemo(() => {
    if (!pricingContext?.tbill91Rate) return null;
    try {
      return computeRecommendedRate({
        principal: new Decimal(principal),
        termMonths,
        riskGrade,
        tbill91Rate: pricingContext.tbill91Rate,
        pcr: pricingContext.pcr,
        pcrStatus: pricingContext.pcrStatus,
        investorPrincipalDue: pricingContext.investorPrincipalDue,
        currentNAV: pricingContext.currentNAV,
        par30: pricingContext.par30,
        par90: pricingContext.par90,
        defaultRate: pricingContext.defaultRate,
        loanBookOutstanding: pricingContext.loanBookOutstanding,
        totalProvisions: pricingContext.totalProvisions,
        activeLoanCount: pricingContext.activeLoanCount,
      });
    } catch { return null; }
  }, [pricingContext, principal, termMonths, riskGrade]);

  const schedule = useMemo(
    () => generateCalcSchedule(principal, annualRate / 100, termMonths, method),
    [principal, annualRate, termMonths, method],
  );

  const totalInterest = schedule.reduce((sum, row) => sum + row.interestDue, 0);
  const totalPayments = schedule.reduce((sum, row) => sum + row.totalDue, 0);
  const feeAmount = principal * (originationFee / 100);
  const effectiveDisbursement = principal - feeAmount;
  const provisionAtDefault = principal * getProvisionRate(defaultScenarioDays);
  const monthlyPayment = schedule.length > 0 ? schedule[0].totalDue : 0;
  const interestPct = totalPayments > 0 ? (totalInterest / totalPayments) * 100 : 0;
  const principalPct = 100 - interestPct;

  function useRecommendedRate() {
    if (pricing) setAnnualRate(pricing.recommended.toNumber());
  }

  return (
    <div className="space-y-5">
      {/* Input controls */}
      <section id="parameters" className="scroll-mt-24">
        <SectionCard title="Loan parameters" description="Adjust inputs to model different loan scenarios. The rate engine updates in real time.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Principal (GHS)</label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm transition-shadow focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
                min={0} step={1000}
              />
              <input type="range" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} min={1000} max={200000} step={1000} className="mt-2 w-full accent-brand-navy" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Annual interest rate (%)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm transition-shadow focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
                  min={0} max={100} step={0.5}
                />
                {pricing && (
                  <button
                    type="button"
                    onClick={useRecommendedRate}
                    className="shrink-0 rounded-lg bg-brand-navy px-3 py-2 text-xs font-semibold text-white hover:bg-brand-navy/90"
                    title={`Use recommended rate: ${pricing.recommended.toFixed(2)}%`}
                  >
                    Use {pricing.recommended.toFixed(1)}%
                  </button>
                )}
              </div>
              <input type="range" value={annualRate} onChange={(e) => setAnnualRate(Number(e.target.value))} min={0} max={60} step={0.5} className="mt-2 w-full accent-brand-navy" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Term (months)</label>
              <input
                type="number"
                value={termMonths}
                onChange={(e) => setTermMonths(Math.max(1, Math.min(60, Number(e.target.value))))}
                className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm transition-shadow focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
                min={1} max={60}
              />
              <input type="range" value={termMonths} onChange={(e) => setTermMonths(Number(e.target.value))} min={1} max={36} className="mt-2 w-full accent-brand-navy" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Interest method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as InterestMethod)} className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10">
                <option value="REDUCING_BALANCE">Reducing balance</option>
                <option value="FLAT">Flat rate</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Borrower risk grade</label>
              <select value={riskGrade} onChange={(e) => setRiskGrade(e.target.value as RiskGrade)} className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10">
                <option value="A">Grade A — Prime</option>
                <option value="B">Grade B — Good</option>
                <option value="C">Grade C — Standard</option>
                <option value="D">Grade D — Sub-standard</option>
                <option value="E">Grade E — High-risk</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Origination fee (%)</label>
              <input type="number" value={originationFee} onChange={(e) => setOriginationFee(Math.max(0, Math.min(10, Number(e.target.value))))} className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10" min={0} max={10} step={0.25} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Default scenario (DPD)</label>
              <select value={defaultScenarioDays} onChange={(e) => setDefaultScenarioDays(Number(e.target.value))} className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10">
                <option value={0}>Current (0 days) — 1%</option>
                <option value={15}>1-30 days — 1%</option>
                <option value={45}>31-60 days — 10%</option>
                <option value={75}>61-90 days — 10%</option>
                <option value={120}>91-180 days — 25%</option>
                <option value={270}>181-360 days — 50%</option>
                <option value={400}>360+ days — 100%</option>
              </select>
            </div>
          </div>
        </SectionCard>
      </section>

      {/* Smart Rate Recommendation */}
      {pricing && (
        <section id="recommendation" className="scroll-mt-24">
          <SectionCard title="Smart rate engine" description="AI-powered rate recommendation based on your fund's current state. Each component shows why that rate was chosen.">
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-3">
                {/* Rate recommendation header */}
                <div className="flex items-start justify-between gap-4 rounded-lg border border-brand-line bg-brand-panel p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Recommended rate</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">{pricing.recommended.toFixed(2)}% <span className="text-base font-normal text-brand-muted">p.a.</span></p>
                    <p className="mt-1 text-xs text-brand-muted">Floor {pricing.floor.toFixed(2)}% · Ceiling {pricing.ceiling.toFixed(2)}%</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge state={pricing.riskLevel === 'LOW' ? 'GREEN' : pricing.riskLevel === 'MODERATE' ? 'GREEN' : pricing.riskLevel === 'HIGH' ? 'WATCH' : 'BREACH'}>
                      {pricing.riskLevel}
                    </StatusBadge>
                    <button type="button" onClick={useRecommendedRate} className="mt-2 block rounded-md bg-brand-navy px-4 py-2 text-xs font-semibold text-white hover:bg-brand-navy/90">
                      Apply rate
                    </button>
                  </div>
                </div>

                {/* Rate components breakdown */}
                <div className="rounded-md border border-brand-line">
                  <div className="border-b border-brand-line bg-brand-panel px-3 py-2">
                    <p className="text-xs font-semibold text-brand-muted">Rate components (how the rate was built)</p>
                  </div>
                  <div className="divide-y divide-brand-line">
                    {pricing.components.map((component) => (
                      <div key={component.label} className="flex items-start justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-brand-black">{component.label}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-brand-muted">{component.description}</p>
                        </div>
                        <span className={`shrink-0 font-mono text-sm font-bold ${component.value.lt(0) ? 'text-[#1f5d42]' : component.value.gt(3) ? 'text-[#9b2f28]' : 'text-brand-black'}`}>
                          {component.value.gt(0) ? '+' : ''}{component.value.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-brand-navy/5 px-3 py-3">
                      <span className="text-xs font-bold text-brand-navy">Total recommended</span>
                      <span className="font-mono text-lg font-bold text-brand-navy">{pricing.recommended.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Rationale */}
                <p className="rounded-md border border-brand-line bg-white px-3 py-2.5 text-xs leading-relaxed text-brand-charcoal">
                  {pricing.rationale}
                </p>
              </div>

              {/* Right column: Opportunity cost + Red team */}
              <div className="space-y-3">
                {/* Opportunity cost */}
                <div className="rounded-md border border-brand-line bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-brand-muted">Opportunity cost comparison</p>
                  <p className="mt-0.5 text-[10px] text-brand-muted">What if we bought T-Bills instead of making this loan?</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-brand-muted">T-Bill return</span>
                      <span className="font-mono font-semibold">{formatDecMoney(pricing.opportunityCost.tbillReturn)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-brand-muted">Loan gross interest</span>
                      <span className="font-mono font-semibold">{formatDecMoney(pricing.opportunityCost.recommendedGrossInterest)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-brand-muted">Expected loss</span>
                      <span className="font-mono font-semibold text-[#9b2f28]">-{formatDecMoney(pricing.opportunityCost.expectedLoss)}</span>
                    </div>
                    <div className="flex justify-between border-t border-brand-line pt-2 text-xs">
                      <span className="font-semibold text-brand-black">Net spread</span>
                      <span className={`font-mono font-bold ${pricing.opportunityCost.netExpectedSpread.lt(0) ? 'text-[#9b2f28]' : 'text-[#1f5d42]'}`}>
                        {formatDecMoney(pricing.opportunityCost.netExpectedSpread)}
                      </span>
                    </div>
                    <div className="mt-1 rounded-md bg-brand-panel px-2 py-1.5 text-center">
                      <StatusBadge state={pricing.opportunityCost.decision === 'PREFER_LOAN' ? 'GREEN' : pricing.opportunityCost.decision === 'PREFER_TBILL' ? 'BREACH' : 'WATCH'}>
                        {pricing.opportunityCost.decision === 'PREFER_LOAN' ? 'Loan wins' : pricing.opportunityCost.decision === 'PREFER_TBILL' ? 'T-Bill wins' : 'Review needed'}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                {/* Red team findings */}
                <div className="rounded-md border border-brand-line bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-brand-muted">Red team assessment</p>
                  <p className="mt-0.5 text-[10px] text-brand-muted">Automatic challenges before loan approval</p>
                  <div className="mt-2 space-y-2">
                    {pricing.redTeamFindings.map((finding, i) => (
                      <div key={i} className="rounded-md border border-brand-line bg-brand-panel p-2">
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${finding.severity === 'BREACH' ? 'bg-[#9b2f28]' : finding.severity === 'WATCH' ? 'bg-[#b8860b]' : 'bg-[#1f5d42]'}`} />
                          <div>
                            <p className={`text-[11px] font-semibold ${finding.severity === 'BREACH' ? 'text-[#9b2f28]' : finding.severity === 'WATCH' ? 'text-[#80611a]' : 'text-[#1f5d42]'}`}>
                              {finding.finding}
                            </p>
                            <p className="mt-0.5 text-[10px] text-brand-muted">{finding.action}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </section>
      )}

      {!pricingContext?.tbill91Rate && (
        <div className="rounded-md border border-brand-line bg-white px-4 py-3 text-sm text-brand-muted">
          <strong>Rate engine unavailable:</strong> Add a T-Bill holding with a return rate in the Market module to enable smart rate recommendations.
        </div>
      )}

      {/* Summary KPIs */}
      <div className="kpi-scroll-row grid gap-4 md:grid-cols-4">
        <KpiCard label="Monthly payment" value={money(monthlyPayment)} />
        <KpiCard label="Total interest" value={money(totalInterest)} detail={`${interestPct.toFixed(1)}% of total payments`} />
        <KpiCard label="Total cost" value={money(totalPayments + feeAmount)} detail={`Principal + interest + ${money(feeAmount)} fee`} />
        <KpiCard
          label="Provision required"
          value={money(provisionAtDefault)}
          detail={`${(getProvisionRate(defaultScenarioDays) * 100).toFixed(0)}% rate at ${defaultScenarioDays} DPD`}
          state={defaultScenarioDays > 90 ? 'BREACH' : defaultScenarioDays > 30 ? 'WATCH' : 'GREEN'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        {/* Schedule table */}
        <section id="schedule" className="scroll-mt-24">
          <SectionCard title="Amortization schedule" description={`${method === 'FLAT' ? 'Flat' : 'Reducing balance'} method · ${termMonths} months · ${annualRate}% p.a.`}>
            {schedule.length === 0 ? (
              <p className="py-8 text-center text-sm text-brand-muted">Enter valid loan parameters above.</p>
            ) : (
              <div className="max-h-96 overflow-auto rounded-md border border-brand-line">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead className="sticky top-0 bg-brand-panel">
                    <tr className="border-b border-brand-line text-[10px] uppercase text-brand-muted">
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Principal</th>
                      <th className="px-3 py-2 font-semibold">Interest</th>
                      <th className="px-3 py-2 font-semibold">Total</th>
                      <th className="px-3 py-2 font-semibold">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.period} className="border-b border-brand-line last:border-0 hover:bg-brand-panel">
                        <td className="px-3 py-2 font-mono text-brand-muted">{row.period}</td>
                        <td className="px-3 py-2 font-mono">{money(row.principalDue)}</td>
                        <td className="px-3 py-2 font-mono text-brand-muted">{money(row.interestDue)}</td>
                        <td className="px-3 py-2 font-mono font-semibold">{money(row.totalDue)}</td>
                        <td className="px-3 py-2 font-mono">{money(row.outstandingAfter)}</td>
                      </tr>
                    ))}
                    <tr className="bg-brand-panel font-semibold">
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 font-mono">{money(principal)}</td>
                      <td className="px-3 py-2 font-mono">{money(totalInterest)}</td>
                      <td className="px-3 py-2 font-mono">{money(totalPayments)}</td>
                      <td className="px-3 py-2 font-mono">{money(0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </section>

        {/* Visual breakdown */}
        <section id="breakdown" className="scroll-mt-24 space-y-5">
          <SectionCard title="Cost breakdown">
            <div className="flex flex-col items-center gap-4">
              <svg viewBox="0 0 120 120" className="h-36 w-36">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--brand-line)" strokeWidth="12" />
                {totalPayments > 0 && (
                  <>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--brand-navy)" strokeWidth="12"
                      strokeDasharray={`${principalPct * 3.14} ${interestPct * 3.14}`}
                      strokeDashoffset="0" transform="rotate(-90 60 60)" strokeLinecap="round" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#d97706" strokeWidth="12"
                      strokeDasharray={`${interestPct * 3.14} ${principalPct * 3.14}`}
                      strokeDashoffset={`${-principalPct * 3.14}`}
                      transform="rotate(-90 60 60)" strokeLinecap="round" />
                  </>
                )}
                <text x="60" y="56" textAnchor="middle" className="text-[10px] font-semibold fill-brand-black">
                  {money(totalPayments).replace('GHS ', '')}
                </text>
                <text x="60" y="70" textAnchor="middle" className="text-[8px] fill-brand-muted">total payments</text>
              </svg>
              <div className="w-full space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-brand-navy" />Principal</span>
                  <span className="font-mono font-semibold">{money(principal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />Interest</span>
                  <span className="font-mono font-semibold">{money(totalInterest)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-brand-line pt-2">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-brand-charcoal" />Origination fee</span>
                  <span className="font-mono font-semibold">{money(feeAmount)}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Disbursement">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-brand-muted">Principal</span><span className="font-mono font-semibold">{money(principal)}</span></div>
              <div className="flex justify-between"><span className="text-brand-muted">Less origination fee</span><span className="font-mono font-semibold text-red-600">-{money(feeAmount)}</span></div>
              <div className="flex justify-between border-t border-brand-line pt-2">
                <span className="font-semibold text-brand-black">Net disbursement</span>
                <span className="font-mono font-bold text-brand-navy">{money(effectiveDisbursement)}</span>
              </div>
            </div>
          </SectionCard>
        </section>
      </div>
    </div>
  );
}
