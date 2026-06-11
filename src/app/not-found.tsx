import Link from 'next/link';

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-surface">
      <div className="mx-auto max-w-md text-center">
        <p className="text-7xl font-bold text-brand-navy">404</p>
        <h2 className="mt-4 text-xl font-semibold text-brand-black">Page not found</h2>
        <p className="mt-2 text-sm text-brand-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-brand-line bg-white px-5 py-2.5 text-sm font-semibold text-brand-black hover:bg-brand-surface"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
