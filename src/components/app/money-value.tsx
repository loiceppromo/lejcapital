'use client';

import { useCurrency } from './currency-toggle';
import type { Decimal } from '@/lib/finance';

/**
 * Client component that displays a monetary value in the user's selected currency.
 * Wraps the CurrencyProvider context so values auto-convert when the toggle is used.
 *
 * Use this instead of the server-side `money()` selector when the value should
 * react to the currency toggle in real time.
 */
export function MoneyValue({
  amount,
  className,
  mono = true,
}: {
  amount: Decimal | number | null;
  className?: string;
  /** Use monospace font (default: true) */
  mono?: boolean;
}) {
  const { fmt } = useCurrency();
  return <span className={className ?? (mono ? 'font-mono' : '')}>{fmt(amount)}</span>;
}
