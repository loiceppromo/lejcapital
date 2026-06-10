'use client';

import { useEffect, useState } from 'react';

export function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('lej-dark-mode') === 'true';
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [dark]);

  function toggle() {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark-mode', next);
      window.localStorage.setItem('lej-dark-mode', String(next));
      return next;
    });
  }

  return (
    <button
      onClick={toggle}
      className="rounded-md border border-brand-line bg-white p-1.5 text-brand-muted hover:border-brand-charcoal hover:text-brand-black dark-mode:border-slate-600 dark-mode:bg-slate-800 dark-mode:text-slate-300"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? (
        // Sun icon
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      ) : (
        // Moon icon
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      )}
    </button>
  );
}
