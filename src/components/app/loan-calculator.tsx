'use client';

import { useMemo, useState } from 'react';
import { KpiCard } from './kpi-card';
import { SectionCard } from './section-card';

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
    // Reducing balance
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) {
      const monthly = principal / termMonths;
      let outstanding = principal;
      for (let i = 1; i <= termMonths; i++) {
        outstanding -= monthly;
        rows.push({
          period: i,
          principalDue: monthly,
          interestDue: 0,
          totalDue: monthly,
          outstandingAfter: Math.max(0, outstanding),
        });
      }
    } else {
      const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1);
      let outstanding = principal;

      for (let i = 1; i <= termMonths; i++) {
        const interestDue = outstanding * monthlyRate;
        const principalDue = emi - interestDue;
        outstanding -= principalDue;
        rows.push({
          period: i,
          principalDue,
          interestDue,
          totalDue: emi,
          outstandingAfter: Math.max(0, outstanding),
        });
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

export function LoanCalculator() {
  const [principal, setPrincipal] = useState(20000);
  const [annualRate, setAnnualRate] = useState(30);
  const [termMonths, setTermMonths] = useState(6);
  const [method, setMethod] = useState<InterestMethod>('REDUCING_BALANCE');
  const [originationFee, setOriginationFee] = useState(2.5);
  const [defaultScenarioDays, setDefaultScenarioDays] = useState(0);

  const schedule = useMemo(
    () => generateCalcSchedule(principal, annualRate / 100, termMonths, method),
    [principal, annualRate, termMonths, method],
  );

  const totalInterest = schedule.reduce((sum, row) => sum + row.interestDue, 0);
  const totalPayments = schedule.reduce((sum, row) => sum + row.totalDue, 0);
  const feeAmount = principal * (originationFee / 100);
  const effectiveDisbursement = principal - feeAmount;
  const totalCostToFund = totalPayments + feeAmount;
  const provisionAtDefault = principal * getProvisionRate(defaultScenarioDays);
  const monthlyPayment = schedule.length > 0 ? schedule[0].totalDue : 0;

  // Interest breakdown for donut
  const interestPct = totalPayments > 0 ? (totalInterest / totalPayments) * 100 : 0;
  const principalPct = 100 - interestPct;

  return (
    <div className="space-y-5">
      {/* Input controls */}
      <SectionCard title="Loan parameters" description="Adjust inputs to model different loan scenarios. Changes are reflected instantly.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Principal (GHS)</label>
            <input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm transition-shadow focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              min={0}
              step={1000}
            />
            <input
              type="range"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              min={1000}
              max={200000}
              step={1000}
              className="mt-2 w-full accent-brand-navy"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Annual interest rate (%)</label>
            <input
              type="number"
              value={annualRate}
              onChange={(e) => setAnnualRate(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm transition-shadow focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              min={0}
              max={100}
              step={0.5}
            />
            <input
              type="range"
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              min={0}
              max={60}
              step={0.5}
              className="mt-2 w-full accent-brand-navy"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Term (months)</label>
            <input
              type="number"
              value={termMonths}
              onChange={(e) => setTermMonths(Math.max(1, Math.min(60, Number(e.target.value))))}
              className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm transition-shadow focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              min={1}
              max={60}
            />
            <input
              type="range"
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value))}
              min={1}
              max={36}
              className="mt-2 w-full accent-brand-navy"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Interest method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as InterestMethod)}
              className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
            >
              <option value="REDUCING_BALANCE">Reducing balance</option>
              <option value="FLAT">Flat rate</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Origination fee (%)</label>
            <input
              type="number"
              value={originationFee}
              onChange={(e) => setOriginationFee(Math.max(0, Math.min(10, Number(e.target.value))))}
              className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm transition-shadow focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              min={0}
              max={10}
              step={0.25}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-muted">Default scenario (DPD)</label>
            <select
              value={defaultScenarioDays}
              onChange={(e) => setDefaultScenarioDays(Number(e.target.value))}
              className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shadow-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
            >
              <option value={0}>Current (0 days) &mdash; 1%</option>
              <option value={15}>1-30 days &mdash; 1%</option>
              <option value={45}>31-60 days &mdash; 10%</option>
              <option value={75}>61-90 days &mdash; 10%</option>
              <option value={120}>91-180 days &mdash; 25%</option>
              <option value={270}>181-360 days &mdash; 50%</option>
              <option value={400}>360+ days &mdash; 100%</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* Summary KPIs */}
      <div className="kpi-scroll-row grid gap-4 md:grid-cols-4">
        <KpiCard label="Monthly payment" value={money(monthlyPayment)} />
        <KpiCard label="Total interest" value={money(totalInterest)} detail={`${interestPct.toFixed(1)}% of total payments`} />
        <KpiCard label="Total cost" value={money(totalCostToFund)} detail={`Principal + interest + ${money(feeAmount)} fee`} />
        <KpiCard
          label="Provision required"
          value={money(provisionAtDefault)}
          detail={`${(getProvisionRate(defaultScenarioDays) * 100).toFixed(0)}% rate at ${defaultScenarioDays} DPD`}
          state={defaultScenarioDays > 90 ? 'BREACH' : defaultScenarioDays > 30 ? 'WATCH' : 'GREEN'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        {/* Schedule table */}
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

        {/* Visual breakdown */}
        <div className="space-y-5">
          <SectionCard title="Cost breakdown">
            <div className="flex flex-col items-center gap-4">
              {/* Donut chart */}
              <svg viewBox="0 0 120 120" className="h-36 w-36">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--brand-line)" strokeWidth="12" />
                {totalPayments > 0 && (
                  <>
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke="var(--brand-navy)"
                      strokeWidth="12"
                      strokeDasharray={`${principalPct * 3.14} ${interestPct * 3.14}`}
                      strokeDashoffset="0"
                      transform="rotate(-90 60 60)"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke="#d97706"
                      strokeWidth="12"
                      strokeDasharray={`${interestPct * 3.14} ${principalPct * 3.14}`}
                      strokeDashoffset={`${-principalPct * 3.14}`}
                      transform="rotate(-90 60 60)"
                      strokeLinecap="round"
                    />
                  </>
                )}
                <text x="60" y="56" textAnchor="middle" className="text-[10px] font-semibold fill-brand-black">
                  {money(totalPayments).replace('GHS ', '')}
                </text>
                <text x="60" y="70" textAnchor="middle" className="text-[8px] fill-brand-muted">
                  total payments
                </text>
              </svg>

              <div className="w-full space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-brand-navy" />
                    Principal
                  </span>
                  <span className="font-mono font-semibold">{money(principal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                    Interest
                  </span>
                  <span className="font-mono font-semibold">{money(totalInterest)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-brand-line pt-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-brand-charcoal" />
                    Origination fee
                  </span>
                  <span className="font-mono font-semibold">{money(feeAmount)}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Disbursement">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-brand-muted">Principal</span>
                <span className="font-mono font-semibold">{money(principal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Less origination fee</span>
                <span className="font-mono font-semibold text-red-600">-{money(feeAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-brand-line pt-2">
                <span className="font-semibold text-brand-black">Net disbursement</span>
                <span className="font-mono font-bold text-brand-navy">{money(effectiveDisbursement)}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
