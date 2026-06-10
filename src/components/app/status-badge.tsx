import type { RiskState } from '@/lib/platform/types';

const tones = {
  GREEN: 'bg-[#edf5f1] text-[#1f5d42] ring-[#c9ddd4]',
  WATCH: 'bg-[#fbf3df] text-[#80611a] ring-[#ead8aa]',
  BREACH: 'bg-[#fbebea] text-[#9b2f28] ring-[#edc5c1]',
  NEUTRAL: 'bg-brand-panel text-brand-charcoal ring-brand-line',
};

export function StatusBadge({
  children,
  state = 'NEUTRAL',
}: {
  children: React.ReactNode;
  state?: RiskState | 'NEUTRAL';
}) {
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase ring-1 ${tones[state]}`}>
      {children}
    </span>
  );
}
