interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'No records',
  description = 'There is no data to display for this view yet.',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-line bg-brand-panel text-brand-muted">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h7.25L18 7.5v12.75H7z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75V7.5H18M9.5 11h5M9.5 14h5M9.5 17h3" />
        </svg>
      </div>
      <p className="mt-3 text-sm font-semibold text-brand-black">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-brand-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
