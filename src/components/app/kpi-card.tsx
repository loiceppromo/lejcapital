'use client';

import { useState, useRef } from 'react';
import { Sparkline } from '@/components/charts/sparkline';
import { StatusBadge } from './status-badge';
import type { RiskState } from '@/lib/platform/types';

const stateAccents: Record<string, string> = {
  GREEN: 'border-l-[#059669]',
  WATCH: 'border-l-[#d97706]',
  BREACH: 'border-l-[#dc2626]',
};

export function KpiCard({
  label,
  value,
  detail,
  state,
  trend,
  breakdown,
}: {
  label: string;
  value: string;
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

  const accentClass = state && stateAccents[state] ? `border-l-[3px] ${stateAccents[state]}` : '';

  return (
    <div
      data-density-card
      className={`card-scale-in card-hover-lift relative rounded-lg border border-brand-line bg-white p-4 shadow-sm ${accentClass}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
        {state ? <StatusBadge state={state}>{state}</StatusBadge> : null}
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <p className="text-[1.4rem] font-bold leading-none tracking-tight text-brand-black">{value}</p>
        {trend && trend.length >= 2 ? <Sparkline data={trend} /> : null}
      </div>
      {detail ? <p className="mt-2 text-xs leading-5 text-brand-muted">{detail}</p> : null}

      {showBreakdown && breakdown && breakdown.length > 0 && (
        <div className="chart-tooltip absolute left-0 right-0 top-full z-50 mt-1.5 rounded-lg border border-brand-line bg-white p-3 shadow-xl">
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
