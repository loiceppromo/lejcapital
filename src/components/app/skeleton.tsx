/**
 * Skeleton loading placeholders with shimmer animation.
 * Uses the .skeleton-shimmer class from globals.css.
 */

interface SkeletonProps {
  className?: string;
}

function SkeletonBlock({ className = '' }: SkeletonProps) {
  return <div className={`skeleton-shimmer rounded ${className}`} />;
}

export function SkeletonKpi({ className = '' }: SkeletonProps) {
  return (
    <div className={`rounded-lg border border-brand-line bg-white p-4 shadow-sm card-scale-in ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-3 h-7 w-32" />
          <SkeletonBlock className="mt-3 h-3 w-28" />
        </div>
        <SkeletonBlock className="h-8 w-14 rounded-full" />
      </div>
      <SkeletonBlock className="mt-4 h-8 w-full" />
    </div>
  );
}

export function SkeletonCard({ rows = 4, className = '' }: SkeletonProps & { rows?: number }) {
  return (
    <div className={`rounded-lg border border-brand-line bg-white p-4 shadow-sm card-scale-in ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="mt-2 h-3 w-48" />
        </div>
        <SkeletonBlock className="h-8 w-20 rounded-md" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-3 w-1/3" />
            <SkeletonBlock className="h-3 w-1/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 5, className = '' }: SkeletonProps & { rows?: number; columns?: number }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-brand-line bg-white shadow-sm card-scale-in ${className}`}>
      <div className="border-b border-brand-line p-4">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="mt-2 h-3 w-64 max-w-full" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="bg-brand-surface">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-4 py-3">
                  <SkeletonBlock className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-t border-brand-line">
                {Array.from({ length: columns }).map((_, columnIndex) => (
                  <td key={columnIndex} className="px-4 py-3">
                    <SkeletonBlock className={columnIndex === 0 ? 'h-3 w-32' : 'h-3 w-20'} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonKPIRow({ count = 4 }: { count?: number }) {
  return (
    <div className="kpi-scroll-row grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKpi key={i} />
      ))}
    </div>
  );
}

export function SkeletonChart({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex items-center justify-center rounded-lg border border-brand-line bg-white p-8 card-scale-in ${className}`}>
      <SkeletonBlock className="h-48 w-48 rounded-full" />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-5 page-fade-in">
      <SkeletonBlock className="h-8 w-48" />
      <SkeletonBlock className="h-4 w-96" />
      <SkeletonKPIRow />
      <div className="grid gap-5 md:grid-cols-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <SkeletonTable />
    </div>
  );
}
