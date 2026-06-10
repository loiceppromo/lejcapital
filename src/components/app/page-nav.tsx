'use client';

import { useEffect, useState } from 'react';

interface PageNavItem {
  id: string;
  label: string;
}

/**
 * Sticky page section navigator — scrollspy that highlights
 * the current visible section as you scroll down long pages.
 */
export function PageNav({ items }: { items: PageNavItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="sticky top-16 z-10 -mx-4 mb-4 hidden overflow-x-auto border-b border-brand-line bg-white/95 px-4 backdrop-blur md:block lg:-mx-6 lg:px-6">
      <div className="flex gap-1">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(item.id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveId(item.id);
              }
            }}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
              activeId === item.id
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-brand-muted hover:border-brand-silver hover:text-brand-charcoal'
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
