import { Icon } from './icon';

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
      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-brand-line bg-brand-surface text-brand-muted">
        <Icon name="file-text" className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-brand-black">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-brand-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
