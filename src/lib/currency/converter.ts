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

export type CurrencyCode = 'GHS' | 'USD';

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
 * Convert an amount from one currency to another.
 */
export function convertAmount(
  amount: Decimal | number | null,
  from: CurrencyCode,
  to: CurrencyCode,
): Decimal | null {
  if (amount === null) return null;
  const value = amount instanceof Decimal ? amount : new Decimal(amount);
  if (from === to) return value;
  const rate = getRate(from, to);
  return value.times(rate);
}

/**
 * Format an amount in the specified currency.
 */
export function formatCurrency(
  amount: Decimal | number | null,
  currency: CurrencyCode = 'GHS',
): string {
  if (amount === null) return 'TBC';
  const value = amount instanceof Decimal ? amount.toNumber() : amount;
  const config = CURRENCIES[currency];
  return `${config.code} ${value.toLocaleString(config.locale, {
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
  if (amount === null) return 'TBC';
  const primary = formatCurrency(amount, primaryCurrency);
  const secondaryCurrency: CurrencyCode = primaryCurrency === 'GHS' ? 'USD' : 'GHS';
  const converted = convertAmount(
    amount instanceof Decimal ? amount : new Decimal(amount),
    primaryCurrency,
    secondaryCurrency,
  );
  const secondary = converted ? formatCurrency(converted, secondaryCurrency) : 'TBC';
  return `${primary} (${secondary})`;
}
