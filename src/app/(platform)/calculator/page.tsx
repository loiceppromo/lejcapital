import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { PageNav } from '@/components/app/page-nav';
import { LoanCalculator } from '@/components/app/loan-calculator';
import { loadPlatformState } from '@/lib/data/queries';
import { getLoanPricingContext } from '@/lib/platform/selectors';

export const metadata: Metadata = { title: 'Loan Calculator | LEJ Capital' };

export default async function CalculatorPage() {
  const state = await loadPlatformState();
  const pricingContext = getLoanPricingContext(state);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calculator' }]}
        title="Loan calculator"
        description="Model loan scenarios with the smart rate engine. The recommended rate considers your fund's PCR health, T-Bill opportunity cost, borrower risk, and capital obligations."
      />
      <PageNav items={[
        { id: 'parameters', label: 'Parameters' },
        { id: 'recommendation', label: 'Rate engine' },
        { id: 'schedule', label: 'Schedule' },
        { id: 'breakdown', label: 'Breakdown' },
      ]} />
      <LoanCalculator pricingContext={pricingContext} />
    </>
  );
}
