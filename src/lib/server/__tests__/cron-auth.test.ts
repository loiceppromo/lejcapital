import { describe, expect, it } from 'vitest';
import { isAuthorizedCronRequest } from '../cron-auth';

describe('isAuthorizedCronRequest', () => {
  it('requires the exact bearer token when a secret is configured', () => {
    expect(isAuthorizedCronRequest('Bearer correct', { cronSecret: 'correct', vercelEnvironment: 'production' })).toBe(true);
    expect(isAuthorizedCronRequest('Bearer wrong', { cronSecret: 'correct', vercelEnvironment: 'production' })).toBe(false);
    expect(isAuthorizedCronRequest(null, { cronSecret: 'correct', vercelEnvironment: 'production' })).toBe(false);
  });

  it('refuses an unconfigured production cron endpoint', () => {
    expect(isAuthorizedCronRequest(null, { vercelEnvironment: 'production' })).toBe(false);
  });

  it('permits local development when no cron secret exists', () => {
    expect(isAuthorizedCronRequest(null, { vercelEnvironment: 'development' })).toBe(true);
  });
});
