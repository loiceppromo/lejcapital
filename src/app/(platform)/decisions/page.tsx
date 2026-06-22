import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { EmptyState } from '@/components/app/empty-state';
import { guardPage } from '@/lib/auth/page-guard';
import { canAccess } from '@/lib/auth/roles';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { DecisionCentreClient, type DecisionView } from './decisions-client';

export const metadata: Metadata = { title: 'Decisions | LEJ Capital' };

export default async function DecisionsPage() {
  const { role } = await guardPage('/decisions');
  const canApprove = canAccess(role, 'MANAGE_SETTINGS');

  let decisions: DecisionView[] = [];
  if (isDatabaseConfigured()) {
    const db = await getDb();
    const rows = await db.allocationDecision.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    decisions = rows.map((r) => ({
      id: r.id as string,
      availableCapital: Number(r.availableCapital),
      status: r.status as string,
      restricted: r.restricted as boolean,
      confidence: r.confidence !== null && r.confidence !== undefined ? Number(r.confidence) : null,
      recommendation: r.recommendation as unknown as DecisionView['recommendation'],
      approvedStrategy: (r.approvedStrategy as string) ?? null,
      approvedBy: (r.approvedBy as string) ?? null,
      modificationReason: (r.modificationReason as string) ?? null,
      riskOverride: r.riskOverride as boolean,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      approvedAt: r.approvedAt ? (r.approvedAt instanceof Date ? r.approvedAt.toISOString() : String(r.approvedAt)) : null,
    }));
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Decisions' }]}
        title="Decision Centre"
        description="Capital awaiting allocation, recommendations to approve, and the full decision record. The system recommends — you approve."
      />
      {isDatabaseConfigured() ? (
        <DecisionCentreClient decisions={decisions} canApprove={canApprove} />
      ) : (
        <SectionCard title="Database required">
          <EmptyState title="Connect a database" description="Capital-allocation decisions require a live database connection." />
        </SectionCard>
      )}
    </>
  );
}
