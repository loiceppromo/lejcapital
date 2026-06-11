'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-surface">
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-bold" style={{ color: '#052b57' }}>
              Application Error
            </h1>
            <p className="mb-1 text-sm" style={{ color: '#6b7280' }}>
              {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            {error.digest && (
              <p className="mb-4 font-mono text-xs" style={{ color: '#9ca3af' }}>
                Error ID: {error.digest}
              </p>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={reset}
                className="rounded-md px-5 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: '#052b57' }}
              >
                Try again
              </button>
              <a
                href="/dashboard"
                className="rounded-md border px-5 py-2.5 text-sm font-semibold"
                style={{ borderColor: '#e5e7eb', color: '#052b57' }}
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
