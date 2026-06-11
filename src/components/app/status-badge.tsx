import type { RiskState } from '@/lib/platform/types';

const tones = {
  GREEN: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  WATCH: 'bg-amber-50 text-amber-700 ring-amber-200',
  BREACH: 'bg-red-50 text-red-700 ring-red-200',
  NEUTRAL: 'bg-brand-panel text-brand-charcoal ring-brand-line',
};

const dots = {
  GREEN: 'bg-emerald-500',
  WATCH: 'bg-amber-500',
  BREACH: 'bg-red-500',
  NEUTRAL: 'bg-brand-silver',
};

export function StatusBadge({
  children,
  state = 'NEUTRAL',
  showDot = false,
}: {
  children: React.ReactNode;
  state?: RiskState | 'NEUTRAL';
  showDot?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ring-1 ring-inset ${tones[state]}`}>
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${dots[state]}`} />}
      {children}
    </span>
  );
}
