import { LoginForm } from './login-form';
import { LogoFull } from '@/components/brand/logo';
import { getAuthMode } from '@/lib/auth/mode';

export default async function LoginPage() {
  const authMode = getAuthMode();

  return (
    <div className="lej-login grid min-h-screen bg-[#080a0f] lg:grid-cols-[0.85fr_1.15fr]">
      <section className="hidden border-r border-brand-line bg-[#07090d] px-10 py-9 text-white lg:flex lg:flex-col lg:justify-between">
        <LogoFull background="dark" className="h-12" priority />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Private capital operations</p>
          <h1 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Capital controls, liquidity risk, and audit history in one workspace.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
            LEJ Capital Management internal access for fund operations, cycle governance, portfolio risk, and capital records.
          </p>
        </div>
        <p className="text-xs text-slate-500">Internal use only</p>
      </section>

      <main className="flex min-h-screen flex-col items-center justify-center bg-[#080a0f] px-4">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex justify-center lg:hidden">
            <LogoFull background="dark" className="h-14" priority />
          </div>

          <div className="rounded-md border border-[#202734] bg-[#111720] p-6 text-[#f3f5f7] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8993a3]">Secure access</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#f3f5f7]">Sign in</h2>
            <p className="mt-1 text-sm leading-6 text-[#8993a3]">
              Use the authorized fund manager account to access the LEJ Capital Management platform.
            </p>
            <div className="mt-5">
              <LoginForm authMode={authMode} />
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-[#8993a3]">
            LEJ Capital Management &middot; Audit-controlled workspace
          </p>
        </div>
      </main>
    </div>
  );
}
