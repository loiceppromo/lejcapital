'use client';

import { useState, useRef } from 'react';
import { Sparkline } from '@/components/charts/sparkline';
import { StatusBadge } from './status-badge';
import type { RiskState } from '@/lib/platform/types';

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
  /** Optional array of historical values for a sparkline trend. Minimum 2 points. */
  trend?: number[];
  /** Optional calculation breakdown shown on hover. Each item is a line like "Protection sleeve: GHS 50,000" */
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

  return (
    <div
      data-density-card
      className="relative rounded-md border border-brand-line bg-white p-4 shadow-[0_1px_2px_rgba(3,5,4,0.04)]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-brand-muted">{label}</p>
        {state ? <StatusBadge state={state}>{state}</StatusBadge> : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[1.35rem] font-semibold leading-none text-brand-black">{value}</p>
        {trend && trend.length >= 2 ? <Sparkline data={trend} /> : null}
      </div>
      {detail ? <p className="mt-2 text-xs leading-5 text-brand-muted">{detail}</p> : null}

      {/* Hover breakdown popover */}
      {showBreakdown && breakdown && breakdown.length > 0 && (
        <div className="chart-tooltip absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-brand-line bg-white p-3 shadow-lg">
          <p className="mb-1.5 text-[10px] font-semibold uppercase text-brand-muted">Breakdown</p>
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
