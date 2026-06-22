/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and deployment verification.
 * Returns system status without requiring authentication.
 */
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbOk = false;
  if (isDatabaseConfigured()) {
    try {
      const db = await getDb();
      await db.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }
  const authOk = isSupabaseConfigured();
  const allHealthy = dbOk && authOk;

  return Response.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
      checks: {
        database: dbOk ? 'connected' : 'disconnected',
        auth: authOk ? 'active' : 'seed_mode',
        runtime: 'ok',
      },
    },
    {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
