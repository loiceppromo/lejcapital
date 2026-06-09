/**
 * Database access via Prisma 7 with @prisma/adapter-pg.
 *
 * - Uses the pooled DATABASE_URL (port 6543) for runtime queries.
 * - Falls back to seed mode when DATABASE_URL is not set.
 * - Singleton pattern: one PrismaClient per process.
 */
import type { PrismaClient as PrismaClientType } from '@/generated/prisma/client';

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  return url.length > 0 && !url.includes('[project-ref]') && !url.includes('[YOUR-DB-PASSWORD]');
}

const _holder: { current: PrismaClientType | null } = { current: null };

export async function getDb(): Promise<PrismaClientType> {
  if (_holder.current) return _holder.current;

  if (!isDatabaseConfigured()) {
    throw new Error(
      'DATABASE_URL is not set. The app is running in seed mode. ' +
        'Configure Supabase and set DATABASE_URL in .env.local to enable persistence.',
    );
  }

  // Dynamic imports keep generated code out of client bundles
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const { PrismaClient } = await import('@/generated/prisma/client');

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const client = new PrismaClient({ adapter }) as PrismaClientType;

  _holder.current = client;
  return client;
}
