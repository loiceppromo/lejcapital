'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PageNavItem {
  id: string;
  label: string;
}

/**
 * Sticky page section navigator — scrollspy that highlights
 * the current visible section with a smooth sliding indicator.
 */
export function PageNav({ items }: { items: PageNavItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const updateIndicator = useCallback(() => {
    if (!navRef.current || !indicatorRef.current) return;
    const activeLink = navRef.current.querySelector(`[data-nav-id="${activeId}"]`) as HTMLElement | null;
    if (!activeLink) return;
    const navRect = navRef.current.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    indicatorRef.current.style.left = `${linkRect.left - navRect.left + navRef.current.scrollLeft}px`;
    indicatorRef.current.style.width = `${linkRect.width}px`;
  }, [activeId]);

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

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  if (items.length < 2) return null;

  return (
    <nav className="sticky top-16 z-10 -mx-4 mb-4 hidden overflow-x-auto border-b border-brand-line glass-header px-4 md:block lg:-mx-6 lg:px-6">
      <div ref={navRef} className="relative flex gap-0.5">
        {/* Animated underline indicator */}
        <div
          ref={indicatorRef}
          className="absolute bottom-0 h-[2px] rounded-full bg-brand-accent transition-all duration-300 ease-out"
        />
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            data-nav-id={item.id}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(item.id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveId(item.id);
              }
            }}
            className={`relative whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
              activeId === item.id
                ? 'text-brand-black'
                : 'text-brand-muted hover:text-brand-charcoal'
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
