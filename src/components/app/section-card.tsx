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
        navy: 'border-t-2 border-t-brand-navy',
        success: 'border-t-2 border-t-brand-success',
        warning: 'border-t-2 border-t-brand-warning',
        danger: 'border-t-2 border-t-brand-danger',
      }[accent]
    : '';

  return (
    <section
      data-density-section
      className={`section-fade-in card-hover-lift rounded-lg border border-brand-line bg-white shadow-sm ${accentBorder}`}
    >
      <div data-density-section-header className="flex flex-col gap-3 border-b border-brand-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
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
