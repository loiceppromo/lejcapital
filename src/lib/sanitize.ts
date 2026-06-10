/**
 * Input sanitization utilities for server actions.
 * All user input passes through these before being persisted.
 */

/** Trim whitespace and collapse multiple spaces. Returns empty string for nullish. */
export function sanitizeString(value: FormDataEntryValue | null | undefined): string {
  if (value == null) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

/** Parse a numeric string from form data. Returns null if empty/invalid. */
export function sanitizeNumber(value: FormDataEntryValue | null | undefined): number | null {
  if (value == null) return null;
  const str = String(value).trim();
  if (str === '') return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

/** Parse a positive decimal string from form data. Returns null if empty/invalid/negative. */
export function sanitizeMoney(value: FormDataEntryValue | null | undefined): string | null {
  const num = sanitizeNumber(value);
  if (num === null || num < 0) return null;
  return num.toFixed(2);
}

/** Parse a percentage (0-100) from form data. Returns null if empty/invalid/out of range. */
export function sanitizePercent(value: FormDataEntryValue | null | undefined): string | null {
  const num = sanitizeNumber(value);
  if (num === null || num < 0 || num > 100) return null;
  return num.toString();
}

/** Parse a date string (YYYY-MM-DD) from form data. Returns null if invalid. */
export function sanitizeDate(value: FormDataEntryValue | null | undefined): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const date = new Date(str);
  if (isNaN(date.getTime())) return null;
  return str;
}

/** Parse a boolean checkbox from form data. */
export function sanitizeCheckbox(value: FormDataEntryValue | null | undefined): boolean {
  if (value == null) return false;
  const str = String(value).toLowerCase();
  return str === 'on' || str === 'true' || str === '1';
}

/** Validate a string is one of allowed values. Returns null if not in list. */
export function sanitizeEnum<T extends string>(
  value: FormDataEntryValue | null | undefined,
  allowed: readonly T[],
): T | null {
  const str = sanitizeString(value);
  return (allowed as readonly string[]).includes(str) ? (str as T) : null;
}

/** Strip HTML tags from a string to prevent XSS in stored content. */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

/**
 * Validate required fields in a FormData object.
 * Returns array of missing field names, or empty array if all present.
 */
export function validateRequired(form: FormData, fields: string[]): string[] {
  const missing: string[] = [];
  for (const field of fields) {
    const value = sanitizeString(form.get(field));
    if (!value) missing.push(field);
  }
  return missing;
}
