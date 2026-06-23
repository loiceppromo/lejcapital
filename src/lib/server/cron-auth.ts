/**
 * Cron endpoints are write-capable operational routes. They must never be
 * publicly callable in production when the deployment secret is absent.
 */
export function isAuthorizedCronRequest(
  authorization: string | null,
  environment: { cronSecret?: string; vercelEnvironment?: string },
): boolean {
  if (environment.cronSecret) {
    return authorization === `Bearer ${environment.cronSecret}`;
  }
  return environment.vercelEnvironment !== 'production';
}
