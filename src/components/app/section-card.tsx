export function SectionCard({
  title,
  description,
  action,
  children,
  accent,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  accent?: 'navy' | 'success' | 'warning' | 'danger';
}) {
  const accentBorder = accent
    ? {
        navy: 'border-l-2 border-l-brand-accent',
        success: 'border-l-2 border-l-brand-success',
        warning: 'border-l-2 border-l-brand-warning',
        danger: 'border-l-2 border-l-brand-danger',
      }[accent]
    : '';

  return (
    <section
      data-density-section
      className={`modern-section section-fade-in card-hover-lift overflow-hidden rounded-xl border border-brand-line bg-brand-panel shadow-sm ${accentBorder}`}
    >
      <div data-density-section-header className="flex flex-col gap-3 border-b border-brand-line/80 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-brand-black">{title}</h2>
          {description ? <p className="mt-1 max-w-3xl text-xs leading-5 text-brand-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div data-density-section-body className="p-5">{children}</div>
    </section>
  );
}
