/**
 * Multi-currency support for LEJ Capital.
 *
 * Primary currency: GHS (Ghana Cedi)
 * Secondary currency: USD (US Dollar)
 *
 * Exchange rates are sourced from seed data in development.
 * In production, integrate with Bank of Ghana or a forex API.
 */

import { Decimal } from '@/lib/finance';

export type CurrencyCode = 'GHS' | 'USD' | 'EUR' | 'GBP';

export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  source: string;
  timestamp: string;
}

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  GHS: {
    code: 'GHS',
    symbol: 'GH₵',
    name: 'Ghana Cedi',
    locale: 'en-GH',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimals: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    decimals: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    decimals: 2,
  },
};

/**
 * Current exchange rates (seed mode).
 * In production, these would come from a database or live API.
 */
export function getExchangeRates(): ExchangeRate[] {
  const now = new Date().toISOString();
  return [
    { from: 'GHS', to: 'USD', rate: 0.0641, source: 'SEED', timestamp: now },
    { from: 'USD', to: 'GHS', rate: 15.60, source: 'SEED', timestamp: now },
    { from: 'GHS', to: 'EUR', rate: 0.0588, source: 'SEED', timestamp: now },
    { from: 'EUR', to: 'GHS', rate: 17.01, source: 'SEED', timestamp: now },
    { from: 'GHS', to: 'GBP', rate: 0.0504, source: 'SEED', timestamp: now },
    { from: 'GBP', to: 'GHS', rate: 19.84, source: 'SEED', timestamp: now },
  ];
}

/**
 * Get the rate to convert from one currency to another.
 */
export function getRate(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1;
  const rates = getExchangeRates();
  const pair = rates.find((r) => r.from === from && r.to === to);
  return pair?.rate ?? 0;
}

/**
 * Coerce any money-like input to a finite `Decimal`, or `null` when it cannot
 * be represented. This is deliberately tolerant: Decimal instances passed from
 * Server Components to Client Components are serialized to strings (via
 * `Decimal.toJSON`), so by the time a value reaches client-side formatting it
 * may be a string, a number, or a real Decimal. Returns `null` for
 * NaN/Infinity so callers render a safe placeholder instead of "NaN"/"∞".
 */
export function toDecimal(amount: Decimal | number | string | null | undefined): Decimal | null {
  if (amount === null || amount === undefined) return null;
  if (amount instanceof Decimal) return amount.isFinite() ? amount : null;
  if (typeof amount === 'number') return Number.isFinite(amount) ? new Decimal(amount) : null;
  // string (or anything else) — parse defensively
  const trimmed = String(amount).trim();
  if (trimmed === '') return null;
  try {
    const d = new Decimal(trimmed);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}

/**
 * Convert an amount from one currency to another.
 */
export function convertAmount(
  amount: Decimal | number | string | null,
  from: CurrencyCode,
  to: CurrencyCode,
): Decimal | null {
  const value = toDecimal(amount);
  if (value === null) return null;
  if (from === to) return value;
  const rate = getRate(from, to);
  return value.times(rate);
}

/**
 * Format an amount in the specified currency. Always renders grouped thousands
 * and the currency's configured decimal places (e.g. `GHS 87,000.00`).
 */
export function formatCurrency(
  amount: Decimal | number | string | null,
  currency: CurrencyCode = 'GHS',
): string {
  const decimal = toDecimal(amount);
  const config = CURRENCIES[currency];
  // `null`/non-finite → explicit "TBC" placeholder (never "NaN"/"∞"/"undefined").
  // A genuine zero coerces to Decimal(0), so it still renders as "<CODE> 0.00".
  if (decimal === null) return 'TBC';
  return `${config.code} ${decimal.toNumber().toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  })}`;
}

/**
 * Format amount with both currencies shown.
 */
export function formatDualCurrency(
  amount: Decimal | number | null,
  primaryCurrency: CurrencyCode = 'GHS',
): string {
  if (toDecimal(amount) === null) return 'TBC';
  const primary = formatCurrency(amount, primaryCurrency);
  const secondaryCurrency: CurrencyCode = primaryCurrency === 'GHS' ? 'USD' : 'GHS';
  const converted = convertAmount(amount, primaryCurrency, secondaryCurrency);
  const secondary = converted ? formatCurrency(converted, secondaryCurrency) : 'TBC';
  return `${primary} (${secondary})`;
}
