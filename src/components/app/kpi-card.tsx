import { Sparkline } from '@/components/charts/sparkline';
import { StatusBadge } from './status-badge';
import type { RiskState } from '@/lib/platform/types';

export function KpiCard({
  label,
  value,
  detail,
  state,
  trend,
}: {
  label: string;
  value: string;
  detail?: string;
  state?: RiskState;
  /** Optional array of historical values for a sparkline trend. Minimum 2 points. */
  trend?: number[];
}) {
  return (
    <div className="rounded-md border border-brand-line bg-white p-4 shadow-[0_1px_2px_rgba(3,5,4,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-brand-muted">{label}</p>
        {state ? <StatusBadge state={state}>{state}</StatusBadge> : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[1.35rem] font-semibold leading-none text-brand-black">{value}</p>
        {trend && trend.length >= 2 ? <Sparkline data={trend} /> : null}
      </div>
      {detail ? <p className="mt-2 text-xs leading-5 text-brand-muted">{detail}</p> : null}
    </div>
  );
}
