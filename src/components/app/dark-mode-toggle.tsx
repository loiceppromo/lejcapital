'use client';

import { useEffect, useState } from 'react';
import { Icon } from './icon';

export function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The root layout applies the persisted class before hydration. Read that
    // class rather than briefly clearing it with the server default state.
    const timer = window.setTimeout(() => {
      setDark(document.documentElement.classList.contains('dark-mode'));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (dark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [dark, ready]);

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
      className="rounded-md border border-brand-line bg-brand-panel p-1.5 text-brand-muted hover:border-brand-charcoal hover:text-brand-black dark-mode:border-slate-600 dark-mode:bg-slate-800 dark-mode:text-slate-300"
      title={ready && dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={ready && dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Icon name={ready && dark ? 'sun' : 'moon'} className="h-4 w-4" />
    </button>
  );
}
