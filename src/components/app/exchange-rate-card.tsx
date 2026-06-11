'use client';

import { useCallback, useEffect, useState } from 'react';
import { getExchangeRates, CURRENCIES, type ExchangeRate, type CurrencyCode } from '@/lib/currency/converter';

interface FXPair {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  source: string;
}

/**
 * Compact exchange rate display card showing all FX pairs vs GHS.
 */
export function ExchangeRateCard() {
  const [rates, setRates] = useState<ExchangeRate[]>(() => getExchangeRates());

  const refresh = useCallback(() => {
    setRates(getExchangeRates());
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 0);
    const interval = setInterval(refresh, 300_000); // 5 min
    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [refresh]);

  // Show all foreign → GHS pairs
  const foreignToGhs: FXPair[] = rates
    .filter((r) => r.to === 'GHS' && r.from !== 'GHS')
    .map((r) => ({ from: r.from as CurrencyCode, to: 'GHS', rate: r.rate, source: r.source }));

  if (foreignToGhs.length === 0) return null;

  return (
    <div className="rounded-lg border border-brand-line bg-white p-4 card-scale-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-brand-navy" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">FX Rates</p>
        </div>
        <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[9px] font-medium text-brand-muted uppercase">
          {foreignToGhs[0].source}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {foreignToGhs.map((pair) => (
          <div key={pair.from} className="rounded-md bg-brand-surface p-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-[10px] font-bold text-white">
                {CURRENCIES[pair.from].symbol}
              </span>
              <p className="text-[10px] font-semibold text-brand-charcoal">{pair.from} → GHS</p>
            </div>
            <p className="mt-1.5 text-lg font-bold tracking-tight text-brand-black font-mono">
              {pair.rate.toFixed(2)}
            </p>
            <p className="text-[10px] text-brand-muted">1 {pair.from} = {pair.rate.toFixed(2)} GHS</p>
          </div>
        ))}
      </div>
    </div>
  );
}
