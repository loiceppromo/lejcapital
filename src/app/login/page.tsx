import { LoginForm } from './login-form';
import { BrandMark } from '@/components/brand/logo';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark background="light" className="h-14" />
        </div>

        <div className="rounded-lg border border-brand-silver bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-brand-black">Sign in</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Access the LEJ Capital Management platform.
          </p>
          <div className="mt-5">
            <LoginForm />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-brand-muted">
          LEJ Capital Management &middot; Internal use only
        </p>
      </div>
    </div>
  );
}
