'use client';

import { useMemo, useState } from 'react';
import {
  disbursementConfirmation,
  dueDateReminder,
  finalWarning,
  friendlyReminder,
  fullRepaymentThanks,
  getMessageTypes,
  latePaymentNotice,
  overdueEscalation,
  partialPaymentConfirmation,
  paymentReceived,
  type MessageType,
} from '@/lib/loans/whatsapp-templates';
import { SectionCard } from './section-card';
import { useToast } from './toast';

interface BorrowerLoan {
  loanId: string;
  borrowerName: string;
  borrowerContact: string;
  principal: string;
  netDisbursement: string;
  monthlyPayment: string;
  termMonths: number;
  outstanding: string;
  schedule: Array<{
    period: number;
    dueDate: string;
    totalDue: string;
    status: string;
    daysPastDue: number;
  }>;
}

export function WhatsAppPanel({ loans }: { loans: BorrowerLoan[] }) {
  const [selectedLoanId, setSelectedLoanId] = useState(loans[0]?.loanId ?? '');
  const [messageType, setMessageType] = useState<MessageType>('FRIENDLY_REMINDER');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState('');
  const toast = useToast();

  const loan = useMemo(() => loans.find((l) => l.loanId === selectedLoanId) ?? null, [loans, selectedLoanId]);
  const schedule = useMemo(() => loan?.schedule ?? [], [loan]);
  const item = useMemo(
    () => schedule.find((s) => s.period === selectedPeriod) ?? schedule[0],
    [schedule, selectedPeriod],
  );
  const messageTypes = getMessageTypes();

  const generatedMessage = useMemo(() => {
    if (!loan || !item) return '';
    const base = { borrowerName: loan.borrowerName, loanRef: loan.loanId };

    switch (messageType) {
      case 'DISBURSEMENT_CONFIRMATION':
        return disbursementConfirmation({
          ...base,
          principal: loan.principal,
          netDisbursement: loan.netDisbursement,
          firstPaymentDate: schedule[0]?.dueDate ?? 'TBC',
          monthlyPayment: loan.monthlyPayment,
          termMonths: loan.termMonths,
        });
      case 'FRIENDLY_REMINDER':
        return friendlyReminder({
          ...base,
          dueDate: item.dueDate,
          amountDue: item.totalDue,
          period: item.period,
          outstanding: loan.outstanding,
        });
      case 'DUE_DATE_REMINDER':
        return dueDateReminder({
          ...base,
          dueDate: item.dueDate,
          amountDue: item.totalDue,
          period: item.period,
          outstanding: loan.outstanding,
        });
      case 'LATE_PAYMENT':
        return latePaymentNotice({
          ...base,
          dueDate: item.dueDate,
          amountDue: item.totalDue,
          daysPastDue: item.daysPastDue,
          period: item.period,
        });
      case 'PARTIAL_PAYMENT':
        return partialPaymentConfirmation({
          ...base,
          amountReceived: customAmount || 'GHS 0.00',
          amountRemaining: item.totalDue,
          dueDate: item.dueDate,
          period: item.period,
        });
      case 'PAYMENT_RECEIVED': {
        const nextItem = schedule.find((s) => s.period === item.period + 1);
        return paymentReceived({
          ...base,
          amountReceived: item.totalDue,
          newOutstanding: loan.outstanding,
          period: item.period,
          nextDueDate: nextItem?.dueDate ?? null,
          nextAmount: nextItem?.totalDue ?? null,
        });
      }
      case 'OVERDUE_ESCALATION':
        return overdueEscalation({
          ...base,
          dueDate: item.dueDate,
          amountDue: item.totalDue,
          daysPastDue: item.daysPastDue,
          period: item.period,
        });
      case 'FINAL_WARNING':
        return finalWarning({
          ...base,
          totalOverdue: item.totalDue,
          daysPastDue: item.daysPastDue,
        });
      case 'FULL_REPAYMENT_THANKS':
        return fullRepaymentThanks({
          ...base,
          totalPaid: loan.principal,
        });
      default:
        return '';
    }
  }, [loan, item, messageType, customAmount, schedule]);

  function copyMessage() {
    navigator.clipboard.writeText(generatedMessage).then(() => {
      toast({ tone: 'success', title: 'Copied', message: 'Message copied to clipboard. Paste in WhatsApp.' });
    });
  }

  function openWhatsApp() {
    if (!loan) return;
    // Clean phone number for WhatsApp link
    const phone = loan.borrowerContact.replace(/[^0-9+]/g, '').replace(/^\+/, '');
    const encoded = encodeURIComponent(generatedMessage);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  }

  if (loans.length === 0) {
    return (
      <SectionCard title="WhatsApp communications" description="Send professional messages to borrowers.">
        <p className="py-6 text-center text-sm text-brand-muted">No active loans with borrower contacts.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="WhatsApp communications"
      description="Generate and send professional borrower messages. Select the message type and customise before sending."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-muted">Select borrower loan</label>
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
            <label className="mb-1 block text-xs font-semibold text-brand-muted">Message type</label>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value as MessageType)}
              className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
            >
              {messageTypes.map((mt) => (
                <option key={mt.value} value={mt.value}>
                  {mt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-brand-muted">
              {messageTypes.find((m) => m.value === messageType)?.description}
            </p>
          </div>

          {schedule.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-muted">Payment period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              >
                {schedule.map((s) => (
                  <option key={s.period} value={s.period}>
                    Period {s.period} — Due {s.dueDate} — {s.totalDue} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {messageType === 'PARTIAL_PAYMENT' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-muted">Amount received</label>
              <input
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="e.g. GHS 500.00"
                className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={openWhatsApp}
              disabled={!generatedMessage}
              className="flex-1 rounded-md bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20BD5A] disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Send via WhatsApp
              </span>
            </button>
            <button
              type="button"
              onClick={copyMessage}
              disabled={!generatedMessage}
              className="rounded-md border border-brand-line bg-white px-4 py-2.5 text-sm font-semibold text-brand-black hover:bg-brand-panel disabled:opacity-50"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Message preview */}
        <div className="rounded-md border border-brand-line bg-[#e5ddd5]">
          <div className="border-b border-brand-line bg-[#075e54] px-3 py-2 rounded-t-md">
            <p className="text-xs font-semibold text-white">
              {loan?.borrowerName ?? 'Borrower'} · {loan?.borrowerContact ?? 'No contact'}
            </p>
          </div>
          <div className="h-[440px] overflow-auto p-3">
            {generatedMessage ? (
              <div className="max-w-[85%] rounded-lg bg-white p-3 shadow-sm">
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-gray-800">
                  {generatedMessage}
                </pre>
                <p className="mt-1 text-right text-[10px] text-gray-400">
                  {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ) : (
              <p className="py-20 text-center text-sm text-gray-500">Select a message type to preview.</p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
