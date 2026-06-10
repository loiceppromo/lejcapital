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
    <div className="rounded-md border border-brand-line bg-white p-4 shadow-[0_1px_2px_rgba(3,5,4,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-brand-muted">{label}</p>
        {state ? <StatusBadge state={state}>{state}</StatusBadge> : null}
      </div>
      <p className="mt-3 text-[1.35rem] font-semibold leading-none text-brand-black">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-brand-muted">{detail}</p> : null}
    </div>
  );
}
