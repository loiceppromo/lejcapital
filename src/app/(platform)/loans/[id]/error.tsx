'use client';

import Link from 'next/link';

export default function LoanDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-brand-black">Loan not found or error loading</h2>
        <p className="mb-1 text-sm text-brand-muted">
          {error.message || 'Could not load this loan detail page.'}
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-brand-muted">Error ID: {error.digest}</p>
        )}
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90"
          >
            Try again
          </button>
          <Link
            href="/loans"
            className="rounded-md border border-brand-line bg-white px-4 py-2 text-sm font-semibold text-brand-black hover:bg-brand-panel"
          >
            Back to Loan Book
          </Link>
        </div>
      </div>
    </div>
  );
}
