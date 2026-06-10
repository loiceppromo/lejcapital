import { SkeletonCard, SkeletonKpi, SkeletonTable } from './skeleton';

type ModuleLoadingVariant = 'standard' | 'wide-table' | 'detail' | 'report';

export function ModuleLoading({ variant = 'standard' }: { variant?: ModuleLoadingVariant }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-8 w-60 max-w-full animate-pulse rounded bg-slate-200" />
        <div className="mt-1 h-3 w-96 max-w-full animate-pulse rounded bg-slate-200" />
      </div>

      <div className="kpi-scroll-row grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
      </div>

      {variant === 'detail' ? (
        <>
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <SkeletonCard rows={6} />
            <SkeletonTable rows={8} columns={5} />
          </div>
          <SkeletonTable rows={8} columns={6} />
        </>
      ) : variant === 'wide-table' ? (
        <>
          <SkeletonTable rows={10} columns={6} />
          <div className="grid gap-5 xl:grid-cols-2">
            <SkeletonCard rows={5} />
            <SkeletonCard rows={5} />
          </div>
        </>
      ) : variant === 'report' ? (
        <>
          <div className="grid gap-5 xl:grid-cols-3">
            <SkeletonCard rows={5} />
            <SkeletonCard rows={5} />
            <SkeletonCard rows={5} />
          </div>
          <SkeletonTable rows={8} columns={5} />
        </>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <SkeletonCard rows={6} />
          <SkeletonTable rows={8} columns={5} />
        </div>
      )}
    </div>
  );
}
