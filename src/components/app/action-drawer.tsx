'use client';

import { useRef } from 'react';
import { Icon } from './icon';

export function ActionDrawer({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  function close() {
    if (ref.current) ref.current.open = false;
  }

  return (
    <details ref={ref} className="group">
      <summary className="modern-button inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-brand-navy px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-navy-soft active:scale-[0.98]">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {label}
      </summary>
      <div className="fixed inset-0 z-40 hidden bg-black/65 backdrop-blur-[2px] group-open:block" onClick={close} />
      <div className="drawer-slide-in fixed right-0 top-0 z-50 hidden h-full w-full max-w-lg overflow-y-auto border-l border-brand-line bg-brand-panel shadow-2xl group-open:block">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-brand-line bg-brand-panel/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-muted">Action</p>
            <h2 className="mt-0.5 text-base font-semibold text-brand-black">{title}</h2>
          </div>
          <button
            onClick={close}
            className="rounded-lg border border-brand-line p-2 text-brand-muted transition-colors hover:border-brand-charcoal hover:bg-brand-surface hover:text-brand-black"
            aria-label="Close drawer"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </details>
  );
}
