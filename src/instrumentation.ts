/**
 * Next.js instrumentation hook — runs once on server startup.
 * Used for environment validation and startup diagnostics.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logEnvValidation } = await import('@/lib/env');
    logEnvValidation();
  }
}
