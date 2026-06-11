'use client';

import { useMemo, useState } from 'react';
import { Decimal } from '@/lib/finance';
import { buildLoanContractHTML, type ContractInputs } from '@/lib/loans/contract-builder';
import { SectionCard } from './section-card';
import { useToast } from './toast';

interface LoanSummary {
  loanId: string;
  borrowerName: string;
  borrowerContact: string;
  borrowerIdType: string;
  borrowerIdNumber: string;
  borrowerRiskGrade: string;
  principal: string;
  interestRate: string;
  interestMethod: 'FLAT' | 'REDUCING_BALANCE';
  termMonths: number;
  disbursementDate: string;
  originationFee: string;
  originationFeeMethod: string;
  collateralDesc: string;
  collateralValue: string | null;
  schedule: Array<{
    period: number;
    dueDate: string;
    principalDue: string;
    interestDue: string;
    totalDue: string;
    outstandingAfter: string;
  }>;
}

export function LoanContractPanel({ loans }: { loans: LoanSummary[] }) {
  const [selectedLoanId, setSelectedLoanId] = useState(loans[0]?.loanId ?? '');
  const [purpose, setPurpose] = useState('');
  const [address, setAddress] = useState('');
  const toast = useToast();

  const loan = loans.find((l) => l.loanId === selectedLoanId);

  const contractHTML = useMemo(() => {
    if (!loan) return null;
    const principal = new Decimal(loan.principal);
    const rate = new Decimal(loan.interestRate);
    const originationFee = new Decimal(loan.originationFee);
    const totalRepayment = loan.schedule.reduce(
      (sum, row) => sum + parseFloat(row.totalDue.replace(/[^0-9.]/g, '')),
      0,
    );
    const monthlyPayment = loan.schedule.length > 0
      ? parseFloat(loan.schedule[0].totalDue.replace(/[^0-9.]/g, ''))
      : 0;
    const totalInterest = loan.schedule.reduce(
      (sum, row) => sum + parseFloat(row.interestDue.replace(/[^0-9.]/g, '')),
      0,
    );
    const firstPayment = loan.schedule[0]?.dueDate ?? loan.disbursementDate;

    const inputs: ContractInputs = {
      borrowerName: loan.borrowerName,
      borrowerContact: loan.borrowerContact,
      borrowerAddress: address,
      borrowerIdType: loan.borrowerIdType,
      borrowerIdNumber: loan.borrowerIdNumber,
      borrowerRiskGrade: loan.borrowerRiskGrade,
      loanId: loan.loanId,
      principal,
      interestRate: rate,
      interestMethod: loan.interestMethod,
      termMonths: loan.termMonths,
      disbursementDate: loan.disbursementDate,
      firstPaymentDate: firstPayment,
      originationFee,
      originationFeeMethod: loan.originationFeeMethod,
      totalRepayment: new Decimal(totalRepayment),
      monthlyPayment: new Decimal(monthlyPayment),
      totalInterest: new Decimal(totalInterest),
      collateralDesc: loan.collateralDesc,
      collateralValue: loan.collateralValue ? new Decimal(loan.collateralValue) : null,
      purposeOfLoan: purpose,
      schedule: loan.schedule,
    };

    return buildLoanContractHTML(inputs);
  }, [loan, purpose, address]);

  function openPrintView() {
    if (!contractHTML) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(contractHTML);
    w.document.close();
    toast({ tone: 'success', title: 'Contract opened', message: 'Use Ctrl+P to print or save as PDF.' });
  }

  function copyHTML() {
    if (!contractHTML) return;
    navigator.clipboard.writeText(contractHTML).then(() => {
      toast({ tone: 'success', title: 'Copied', message: 'Contract HTML copied to clipboard.' });
    });
  }

  if (loans.length === 0) {
    return (
      <SectionCard title="Loan contract builder" description="Generate professional loan agreements.">
        <p className="py-6 text-center text-sm text-brand-muted">No active loans to generate contracts for.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Loan contract builder"
      description="Generate a professional, printable loan agreement. Fill in any extra details, then preview or print."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-muted">Select loan</label>
            <select
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
            >
              {loans.map((l) => (
                <option key={l.loanId} value={l.loanId}>
                  {l.borrowerName} — {l.loanId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-muted">Borrower address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 15 Independence Ave, Accra"
              className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-muted">Purpose of loan</label>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Business inventory purchase"
              className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
            />
          </div>

          {loan && (
            <div className="rounded-md border border-brand-line bg-brand-panel p-3 text-xs">
              <p className="font-semibold text-brand-black">Contract summary</p>
              <div className="mt-2 space-y-1 text-brand-charcoal">
                <p>Borrower: <strong>{loan.borrowerName}</strong></p>
                <p>Principal: <strong>{loan.principal}</strong></p>
                <p>Rate: <strong>{(parseFloat(loan.interestRate) * 100).toFixed(2)}%</strong> ({loan.interestMethod === 'FLAT' ? 'Flat' : 'Reducing balance'})</p>
                <p>Term: <strong>{loan.termMonths} months</strong></p>
                <p>Payments: <strong>{loan.schedule.length} instalments</strong></p>
                <p>ID: <strong>{loan.borrowerIdType} · {loan.borrowerIdNumber}</strong></p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={openPrintView}
              disabled={!contractHTML}
              className="flex-1 rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50"
            >
              Preview & print
            </button>
            <button
              type="button"
              onClick={copyHTML}
              disabled={!contractHTML}
              className="rounded-md border border-brand-line bg-white px-4 py-2.5 text-sm font-semibold text-brand-black hover:bg-brand-panel disabled:opacity-50"
            >
              Copy HTML
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-md border border-brand-line bg-white">
          <div className="border-b border-brand-line bg-brand-panel px-3 py-2">
            <p className="text-xs font-semibold text-brand-muted">Contract preview</p>
          </div>
          <div className="h-[500px] overflow-auto p-2">
            {contractHTML ? (
              <iframe
                srcDoc={contractHTML}
                title="Contract preview"
                className="h-full w-full border-0"
                sandbox="allow-same-origin"
              />
            ) : (
              <p className="py-20 text-center text-sm text-brand-muted">Select a loan to generate the contract.</p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
