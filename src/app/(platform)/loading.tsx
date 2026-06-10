import { SkeletonCard, SkeletonKpi, SkeletonTable } from '@/components/app/skeleton';

export default function PlatformLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-brand-line bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-7 w-72 max-w-full animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-md bg-slate-200" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SkeletonCard rows={5} />
        <SkeletonTable rows={6} columns={5} />
      </div>
    </div>
  );
}
