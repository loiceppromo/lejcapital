import { LoginForm } from './login-form';
import { LogoFull } from '@/components/brand/logo';
import { getAuthMode } from '@/lib/auth/mode';

export default async function LoginPage() {
  const authMode = getAuthMode();

  return (
    <div className="grid min-h-screen bg-brand-black lg:grid-cols-[0.92fr_1.08fr]">
      <section className="hidden border-r border-white/10 px-10 py-9 text-white lg:flex lg:flex-col lg:justify-between">
        <LogoFull background="dark" className="h-12" priority />
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Private platform</p>
          <h1 className="mt-3 max-w-md text-3xl font-semibold leading-tight">
            Capital controls, reporting, and audit history in one operating system.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
            LEJ Capital Management internal access for fund operations, cycle governance, portfolio risk, and capital records.
          </p>
        </div>
        <p className="text-xs text-slate-500">Internal use only</p>
      </section>

      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex justify-center lg:hidden">
            <LogoFull background="light" className="h-14" priority />
          </div>

          <div className="rounded-md border border-brand-line bg-white p-6 shadow-[0_12px_40px_rgba(3,5,4,0.08)]">
            <p className="text-xs font-semibold uppercase text-brand-muted">Secure access</p>
            <h2 className="mt-2 text-lg font-semibold text-brand-black">Sign in</h2>
            <p className="mt-1 text-sm leading-6 text-brand-muted">
              Use the authorized fund manager account to access the LEJ Capital Management platform.
            </p>
            <div className="mt-5">
              <LoginForm authMode={authMode} />
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-brand-muted">
            LEJ Capital Management &middot; Audit-controlled workspace
          </p>
        </div>
      </main>
    </div>
  );
}
