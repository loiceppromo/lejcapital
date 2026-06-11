import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { LoanCalculator } from '@/components/app/loan-calculator';

export const metadata: Metadata = { title: 'Loan Calculator | LEJ Capital' };

export default function CalculatorPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calculator' }]}
        title="Loan calculator"
        description="Model loan terms before origination. Adjust principal, rate, and term to see the full amortization schedule, provision impact, and total cost."
      />
      <LoanCalculator />
    </>
  );
}
