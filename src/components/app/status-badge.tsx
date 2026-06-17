import type { RiskState } from '@/lib/platform/types';

const tones = {
  GREEN: 'bg-brand-success/10 text-[#6ed5a8] ring-brand-success/30',
  WATCH: 'bg-brand-warning/10 text-[#f0c678] ring-brand-warning/30',
  BREACH: 'bg-brand-danger/10 text-[#f09a94] ring-brand-danger/30',
  NEUTRAL: 'bg-brand-surface text-brand-charcoal ring-brand-line',
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
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset ${tones[state]}`}>
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${dots[state]}`} />}
      {children}
    </span>
  );
}
