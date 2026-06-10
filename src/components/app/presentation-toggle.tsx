'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from './icon';

export function PresentationToggle() {
  const [active, setActive] = useState(false);

  const toggle = useCallback(() => {
    setActive((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('presentation-mode', next);
      return next;
    });
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Escape to exit presentation mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && active) {
        setActive(false);
        document.documentElement.classList.remove('presentation-mode');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <div className="no-print flex items-center gap-2" data-print-hide>
      <button
        onClick={toggle}
        className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
          active
            ? 'border-brand-navy bg-brand-navy text-white'
            : 'border-brand-line bg-white text-brand-muted hover:border-brand-charcoal hover:text-brand-black'
        }`}
        title={active ? 'Exit presentation mode (Esc)' : 'Enter presentation mode'}
      >
        <Icon name="present" className="mr-1.5 inline-block h-3.5 w-3.5" />
        {active ? 'Exit' : 'Present'}
      </button>
      <button
        onClick={handlePrint}
        className="rounded-md border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
        title="Print / export to PDF"
      >
        <Icon name="print" className="mr-1.5 inline-block h-3.5 w-3.5" />
        Print
      </button>
    </div>
  );
}
