'use client';

import { useState } from 'react';
import { sendLoanDocument, type DeliveryChannel, type LoanDocumentType } from '@/app/actions/communications';
import { recordBorrowerCommunicationConsent } from '@/app/actions/loans';
import { useToast } from './toast';

const documents: Array<{ type: LoanDocumentType; label: string }> = [
  { type: 'CONTRACT', label: 'Loan contract' },
  { type: 'NEXT_INVOICE', label: 'Next invoice' },
  { type: 'LATEST_RECEIPT', label: 'Latest receipt' },
];

export function LoanDocumentDelivery({ loanId, borrowerId, canEmail, canWhatsApp, consented }: { loanId: string; borrowerId: string; canEmail: boolean; canWhatsApp: boolean; consented: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  async function deliver(type: LoanDocumentType, channel: DeliveryChannel) {
    setBusy(`${type}-${channel}`);
    const result = await sendLoanDocument(loanId, type, channel);
    setBusy(null);
    if (result.ok) toast({ tone: 'success', title: 'Document sent', message: result.message });
    else toast({ tone: 'error', title: 'Document not sent', message: result.error });
  }
  async function recordConsent() {
    const result = await recordBorrowerCommunicationConsent(borrowerId, 'Loan detail confirmation');
    if (result.ok) toast({ tone: 'success', title: 'Consent recorded', message: 'Document delivery is now available for this borrower.' });
    else toast({ tone: 'error', title: 'Consent not recorded', message: result.error });
  }
  return (
    <div className="space-y-2">
      {!consented && <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800"><span>Delivery is locked until documented borrower consent is recorded.</span><button onClick={recordConsent} className="shrink-0 rounded-md bg-brand-navy px-2 py-1 text-[11px] font-semibold text-white">Record consent</button></div>}
      {documents.map((document) => (
        <div key={document.type} className="flex items-center justify-between gap-2 rounded-md border border-brand-line bg-brand-panel px-2.5 py-2">
          <span className="text-xs font-medium text-brand-black">{document.label}</span>
          <span className="flex gap-1.5">
            <button disabled={!consented || !canEmail || busy !== null} onClick={() => deliver(document.type, 'EMAIL')} className="rounded-md border border-brand-line bg-white px-2 py-1 text-[11px] font-semibold text-brand-black disabled:opacity-40">{busy === `${document.type}-EMAIL` ? 'Sending…' : 'Email'}</button>
            <button disabled={!consented || !canWhatsApp || busy !== null} onClick={() => deliver(document.type, 'WHATSAPP')} className="rounded-md bg-brand-navy px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-40">{busy === `${document.type}-WHATSAPP` ? 'Sending…' : 'WhatsApp'}</button>
          </span>
        </div>
      ))}
    </div>
  );
}
