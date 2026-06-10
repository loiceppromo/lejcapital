'use client';

import { useCallback, useEffect, useState } from 'react';

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
        <svg className="mr-1.5 inline-block h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h16.5M3.75 3v-.75A.75.75 0 0 1 4.5 1.5h15a.75.75 0 0 1 .75.75V3m0 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
        </svg>
        {active ? 'Exit' : 'Present'}
      </button>
      <button
        onClick={handlePrint}
        className="rounded-md border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
        title="Print / export to PDF"
      >
        <svg className="mr-1.5 inline-block h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m0 0a48.159 48.159 0 0 1 12.5 0m-12.5 0v-2.134a1.125 1.125 0 0 1 1.125-1.125h10.25a1.125 1.125 0 0 1 1.125 1.125V7.034" />
        </svg>
        Print
      </button>
    </div>
  );
}
