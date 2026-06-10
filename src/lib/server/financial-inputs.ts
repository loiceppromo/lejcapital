import { Decimal } from '@/lib/finance';

function cleanNumericInput(value: FormDataEntryValue | string | null): string {
  return String(value ?? '').replaceAll(',', '').trim();
}

export function parseMoneyInput(value: FormDataEntryValue | string | null, field: string): string {
  const cleaned = cleanNumericInput(value);
  if (!cleaned) throw new Error(`${field} is required.`);

  const amount = new Decimal(cleaned);
  if (!amount.isFinite() || amount.isNegative()) {
    throw new Error(`${field} must be a valid non-negative amount.`);
  }

  return amount.toFixed(2);
}

export function parseOptionalMoneyInput(value: FormDataEntryValue | string | null, field: string): string | null {
  const cleaned = cleanNumericInput(value);
  if (!cleaned) return null;
  return parseMoneyInput(cleaned, field);
}

export function parsePositiveMoneyInput(value: FormDataEntryValue | string | null, field: string): string {
  const amount = new Decimal(parseMoneyInput(value, field));
  if (amount.lte(0)) {
    throw new Error(`${field} must be greater than zero.`);
  }
  return amount.toFixed(2);
}

export function parseRateInput(value: FormDataEntryValue | string | null, field: string): string {
  const cleaned = cleanNumericInput(value);
  if (!cleaned) throw new Error(`${field} is required.`);

  const rate = new Decimal(cleaned);
  if (!rate.isFinite() || rate.isNegative()) {
    throw new Error(`${field} must be a valid non-negative rate.`);
  }

  return rate.div(100).toFixed(6);
}

export function parseOptionalRateInput(value: FormDataEntryValue | string | null, field: string): string | null {
  const cleaned = cleanNumericInput(value);
  if (!cleaned) return null;
  return parseRateInput(cleaned, field);
}
