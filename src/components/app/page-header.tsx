import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-brand-line/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-muted">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
                {index > 0 ? (
                  <svg className="h-3 w-3 text-brand-silver" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                ) : null}
                {item.href && index < breadcrumbs.length - 1 ? (
                  <Link href={item.href} className="transition-colors hover:text-brand-accent">
                    {item.label}
                  </Link>
                ) : (
                  <span className={index === breadcrumbs.length - 1 ? 'text-brand-black' : undefined}>{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-[1.8rem] font-semibold leading-tight tracking-tight text-brand-black md:text-[2.25rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">{description}</p> : null}
      </div>
      {action ? <div className="max-w-full overflow-x-auto pb-1 sm:shrink-0">{action}</div> : null}
    </div>
  );
}
