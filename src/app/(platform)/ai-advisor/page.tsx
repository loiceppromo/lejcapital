import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { AIAssistantPanel } from '@/components/app/ai-assistant-panel';
import { guardPage } from '@/lib/auth/page-guard';

export const metadata: Metadata = { title: 'AI Advisor | LEJ Capital' };

export default async function AIAdvisorPage() {
  await guardPage('/ai-advisor');

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AI Advisor' }]}
        title="AI Advisor"
        description="Fund-aware AI assistant for automated logging, decision analysis, and risk recommendations."
      />
      <AIAssistantPanel />
    </>
  );
}
