'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Decimal } from '@/lib/finance';
import {
  CURRENCIES,
  convertAmount,
  formatCurrency,
  getExchangeRates,
  type CurrencyCode,
} from '@/lib/currency/converter';

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** Format a GHS-denominated value in the active currency. */
  fmt: (amount: Decimal | number | null) => string;
  /** Get the active exchange rate label. */
  rateLabel: string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'GHS',
  setCurrency: () => {},
  fmt: () => 'TBC',
  rateLabel: '',
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === 'undefined') return 'GHS';
    const saved = window.localStorage.getItem('lej-currency');
    return saved === 'GHS' || saved === 'USD' || saved === 'EUR' || saved === 'GBP' ? saved : 'GHS';
  });

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    window.localStorage.setItem('lej-currency', code);
  }, []);

  const fmt = useCallback(
    (amount: Decimal | number | null) => {
      if (amount === null) return 'TBC';
      if (currency === 'GHS') return formatCurrency(amount, 'GHS');
      const converted = convertAmount(amount, 'GHS', currency);
      return formatCurrency(converted, currency);
    },
    [currency],
  );

  const rates = getExchangeRates();
  const usdRate = rates.find((r) => r.from === 'USD' && r.to === 'GHS');
  const rateLabel = usdRate ? `1 USD = ${usdRate.rate.toFixed(2)} GHS` : '';

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, fmt, rateLabel }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

/**
 * Currency toggle button for the header bar.
 */
const CURRENCY_CYCLE: CurrencyCode[] = ['GHS', 'USD', 'EUR', 'GBP'];

export function CurrencyToggle() {
  const { currency, setCurrency, rateLabel } = useCurrency();

  function nextCurrency() {
    const idx = CURRENCY_CYCLE.indexOf(currency);
    const next = CURRENCY_CYCLE[(idx + 1) % CURRENCY_CYCLE.length];
    setCurrency(next);
  }

  return (
    <button
      type="button"
      onClick={nextCurrency}
      className="group relative flex items-center gap-1 rounded-md border border-brand-line bg-white px-2 py-1.5 text-xs font-semibold text-brand-charcoal transition-all hover:border-brand-navy hover:text-brand-navy"
      title={`Switch currency · ${rateLabel}`}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-surface text-[10px] font-bold">
        {CURRENCIES[currency].symbol}
      </span>
      <span>{currency}</span>
      <svg className="h-3 w-3 text-brand-muted group-hover:text-brand-navy" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    </button>
  );
}
