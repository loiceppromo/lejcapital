'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('keydown', trapFocus);
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('keydown', trapFocus);
      previouslyFocused?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="modern-button inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-brand-navy px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-navy-soft active:scale-[0.98]"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {label}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px]" onClick={close} aria-hidden="true" />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="drawer-slide-in fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l border-brand-line bg-brand-panel shadow-2xl"
          >
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
        </>
      ) : null}
    </>
  );
}
