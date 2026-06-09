'use client';

import { useRef } from 'react';

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
      <summary className="inline-flex cursor-pointer list-none items-center rounded-md bg-brand-navy px-3 py-2 text-sm font-semibold text-white hover:bg-brand-navy-dark">
        {label}
      </summary>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 hidden bg-black/30 group-open:block" onClick={close} />
      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 hidden h-full w-full max-w-md overflow-y-auto border-l border-brand-silver bg-white shadow-2xl group-open:block">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-brand-silver bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-brand-black">{title}</h2>
          <button
            onClick={close}
            className="rounded-md border border-brand-silver px-2.5 py-1 text-xs font-semibold text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </details>
  );
}
