'use client';

import { useState, useRef } from 'react';
import { Sparkline } from '@/components/charts/sparkline';
import { StatusBadge } from './status-badge';
import { useCurrency } from './currency-toggle';
import type { RiskState } from '@/lib/platform/types';

const stateAccents: Record<string, string> = {
  GREEN: 'border-l-brand-success',
  WATCH: 'border-l-brand-warning',
  BREACH: 'border-l-brand-danger',
};

export function KpiCard({
  label,
  value,
  amount,
  detail,
  state,
  trend,
  breakdown,
}: {
  label: string;
  value: string;
  /**
   * Optional GHS amount as a plain number. When provided, the card re-derives
   * its display value through the currency toggle. Must be a number (not a
   * Decimal) so it serializes cleanly across the Server→Client boundary.
   */
  amount?: number | null;
  detail?: string;
  state?: RiskState;
  trend?: number[];
  breakdown?: string[];
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  function handleMouseEnter() {
    if (!breakdown?.length) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowBreakdown(true), 300);
  }

  function handleMouseLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowBreakdown(false);
  }

  const { fmt } = useCurrency();
  const displayValue = amount !== undefined ? fmt(amount) : value;
  const accentClass = state && stateAccents[state] ? `border-l-2 ${stateAccents[state]}` : '';

  return (
    <div
      data-density-card
      className={`modern-kpi card-scale-in card-hover-lift relative rounded-xl border border-brand-line bg-brand-panel p-4 shadow-sm ${accentClass}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-muted">{label}</p>
        {state ? <StatusBadge state={state}>{state}</StatusBadge> : null}
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <p className="text-[1.5rem] font-semibold leading-none tracking-tight text-brand-black">{displayValue}</p>
        {trend && trend.length >= 2 ? <Sparkline data={trend} /> : null}
      </div>
      {detail ? <p className="mt-2 text-xs leading-5 text-brand-muted">{detail}</p> : null}

      {showBreakdown && breakdown && breakdown.length > 0 && (
        <div className="chart-tooltip absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-brand-line bg-brand-panel p-3 shadow-xl">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-muted">Breakdown</p>
          <div className="space-y-1">
            {breakdown.map((line, i) => (
              <p key={i} className="text-xs text-brand-charcoal">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
