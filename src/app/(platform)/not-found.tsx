import Link from 'next/link';

export default function PlatformNotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <p className="text-6xl font-bold text-brand-navy">404</p>
        <h2 className="mt-4 text-lg font-semibold text-brand-black">Page not found</h2>
        <p className="mt-2 text-sm text-brand-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
