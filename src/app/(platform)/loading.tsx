export default function PlatformLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-line border-t-brand-navy" />
        <p className="text-sm font-medium text-brand-muted">Loading...</p>
      </div>
    </div>
  );
}
