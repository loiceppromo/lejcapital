import { LoginForm } from './login-form';
import { LogoFull } from '@/components/brand/logo';
import { getAuthMode } from '@/lib/auth/mode';

export default async function LoginPage() {
  const authMode = getAuthMode();

  return (
    <div className="lej-login modern-shell grid min-h-screen bg-[#05070b] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden border-r border-brand-line bg-[#05080c] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <LogoFull background="dark" className="h-14" priority />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Private capital command center</p>
          <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight tracking-tight">
            Run capital, loans, risk, and audit from one focused workspace.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-slate-400">
            LEJ Capital Management internal access for fund operations, cycle governance, portfolio risk, and capital records.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
            <p className="text-slate-500">Mode</p>
            <p className="mt-1 font-semibold text-white">Internal</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
            <p className="text-slate-500">Control</p>
            <p className="mt-1 font-semibold text-white">Audit log</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
            <p className="text-slate-500">Scope</p>
            <p className="mt-1 font-semibold text-white">GHS fund</p>
          </div>
        </div>
      </section>

      <main className="flex min-h-screen flex-col items-center justify-center bg-[#05070b] px-4">
        <div className="w-full max-w-md">
          <div className="mb-7 flex justify-center lg:hidden">
            <LogoFull background="dark" className="h-14" priority />
          </div>

          <div className="modern-section rounded-2xl border border-[#243044] bg-[#111720] p-7 text-[#f3f5f7] shadow-[0_28px_90px_rgba(0,0,0,0.34)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8993a3]">Secure access</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#f3f5f7]">Sign in</h2>
            <p className="mt-1 text-sm leading-6 text-[#8993a3]">
              Use the authorized fund manager account to access the LEJ Capital Management platform.
            </p>
            <div className="mt-5">
              <LoginForm authMode={authMode} />
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-[#8993a3]">
            LEJ Capital Management &middot; Audit-controlled workspace
          </p>
        </div>
      </main>
    </div>
  );
}
