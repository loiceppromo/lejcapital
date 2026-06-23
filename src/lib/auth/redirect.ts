/** Only permit local, application-relative destinations after authentication. */
export function safePostAuthPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/dashboard';
  }
  return value;
}
