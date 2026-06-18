'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon } from './icon';

/**
 * Keyboard navigation shortcuts.
 *
 * Two-key sequences (vim-style):
 *   g d → /dashboard
 *   g c → /cycles
 *   g l → /ledger
 *   g e → /engines
 *   g o → /loans
 *   g m → /market
 *   g i → /investors (Capital)
 *   g r → /risk
 *   g a → /audit
 *   g s → /settings
 *
 * Single key:
 *   ?   → toggle shortcut help
 *   Esc → close any open dialog/drawer
 */

const NAV_SHORTCUTS: Record<string, string> = {
  d: '/dashboard',
  c: '/cycles',
  l: '/ledger',
  e: '/engines',
  o: '/loans',
  m: '/market',
  i: '/investors',
  r: '/risk',
  a: '/audit',
  s: '/settings',
};

const SHORTCUT_LABELS: Array<{ keys: string; label: string }> = [
  { keys: 'g d', label: 'Dashboard' },
  { keys: 'g c', label: 'Cycles' },
  { keys: 'g l', label: 'Ledger' },
  { keys: 'g e', label: 'Engines' },
  { keys: 'g o', label: 'Loans' },
  { keys: 'g m', label: 'Market' },
  { keys: 'g i', label: 'Capital' },
  { keys: 'g r', label: 'Risk' },
  { keys: 'g a', label: 'Audit' },
  { keys: 'g s', label: 'Settings' },
  { keys: '?', label: 'Toggle shortcuts help' },
];

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const gPressedRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea, or contentEditable
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (
        target?.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Toggle help
      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Escape to close help
      if (key === 'escape') {
        setShowHelp(false);
        gPressedRef.current = false;
        if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
        return;
      }

      // Two-key "g" sequences
      if (key === 'g' && !gPressedRef.current) {
        gPressedRef.current = true;
        // Reset after 1.5s if no second key
        if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          gPressedRef.current = false;
        }, 1500);
        return;
      }

      if (gPressedRef.current) {
        gPressedRef.current = false;
        if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
        const destination = NAV_SHORTCUTS[key];
        if (destination && destination !== pathname) {
          e.preventDefault();
          router.push(destination);
        }
      }
    },
    [pathname, router],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey, { capture: true });
    (window as Window & { __lejShortcutsReady?: boolean }).__lejShortcutsReady = true;
    return () => {
      (window as Window & { __lejShortcutsReady?: boolean }).__lejShortcutsReady = false;
      document.removeEventListener('keydown', handleKey, { capture: true });
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, [handleKey]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
      <div
        className="w-full max-w-sm rounded-lg border border-brand-line bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-black">Keyboard shortcuts</h2>
          <button
            onClick={() => setShowHelp(false)}
            className="rounded-md p-1 text-brand-muted hover:text-brand-black"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-brand-muted">Press <kbd className="rounded border border-brand-silver bg-brand-surface px-1 py-0.5 text-[10px] font-mono">g</kbd> then a letter to navigate.</p>
        <div className="space-y-1.5">
          {SHORTCUT_LABELS.map(({ keys, label }) => (
            <div key={keys} className="flex items-center justify-between">
              <span className="text-xs text-brand-charcoal">{label}</span>
              <div className="flex gap-1">
                {keys.split(' ').map((k) => (
                  <kbd key={k} className="min-w-[22px] rounded border border-brand-silver bg-brand-surface px-1.5 py-0.5 text-center text-[10px] font-mono font-semibold text-brand-charcoal">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
