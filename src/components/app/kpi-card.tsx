import { StatusBadge } from './status-badge';
import type { RiskState } from '@/lib/platform/types';

export function KpiCard({
  label,
  value,
  detail,
  state,
}: {
  label: string;
  value: string;
  detail?: string;
  state?: RiskState;
}) {
  return (
    <div className="rounded-lg border border-brand-silver bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
        {state ? <StatusBadge state={state}>{state}</StatusBadge> : null}
      </div>
      <p className="mt-3 text-xl font-semibold tracking-tight text-brand-black">{value}</p>
      {detail ? <p className="mt-1 text-sm text-brand-muted">{detail}</p> : null}
    </div>
  );
}
