import { SkeletonCard, SkeletonKpi, SkeletonTable } from '@/components/app/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Header skeleton */}
      <div>
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-1 h-3 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
      </div>

      {/* Chart row */}
      <div className="grid gap-5 md:grid-cols-2">
        <SkeletonCard rows={6} />
        <SkeletonCard rows={6} />
      </div>

      {/* NAV bar placeholder */}
      <SkeletonCard rows={2} />

      {/* Bottom grid */}
      <div className="grid gap-5 xl:grid-cols-2">
        <SkeletonCard rows={4} />
        <SkeletonTable rows={6} columns={4} />
      </div>
    </div>
  );
}
