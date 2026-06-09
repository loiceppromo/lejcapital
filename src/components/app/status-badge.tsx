import type { RiskState } from '@/lib/platform/types';

const tones = {
  GREEN: 'bg-[#e6f0eb] text-[#1f5d42] ring-[#c8ddd3]',
  WATCH: 'bg-amber-100 text-amber-800 ring-amber-200',
  BREACH: 'bg-red-100 text-red-800 ring-red-200',
  NEUTRAL: 'bg-brand-surface-muted text-brand-charcoal ring-brand-silver',
};

export function StatusBadge({
  children,
  state = 'NEUTRAL',
}: {
  children: React.ReactNode;
  state?: RiskState | 'NEUTRAL';
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tones[state]}`}>
      {children}
    </span>
  );
}
