'use client';

import { useEffect, useState } from 'react';
import { Icon } from './icon';

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
      <Icon name={dark ? 'sun' : 'moon'} className="h-4 w-4" />
    </button>
  );
}
