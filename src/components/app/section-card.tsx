export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section data-density-section className="rounded-md border border-brand-line bg-white shadow-[0_1px_2px_rgba(3,5,4,0.04)]">
      <div data-density-section-header className="flex flex-col gap-3 border-b border-brand-line px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-brand-black">{title}</h2>
          {description ? <p className="mt-1 max-w-3xl text-xs leading-5 text-brand-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div data-density-section-body className="p-4">{children}</div>
    </section>
  );
}
