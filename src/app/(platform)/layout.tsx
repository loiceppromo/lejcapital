import { AppShell } from '@/components/app/app-shell';
import { getCurrentUser } from '@/lib/auth/server';
import { isDatabaseConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const dbConnected = isDatabaseConfigured();
  return <AppShell userRole={user.role} userEmail={user.email} dbConnected={dbConnected}>{children}</AppShell>;
}
