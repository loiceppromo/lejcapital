'use client';

import { useId } from 'react';
import { Icon } from './icon';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea';
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  options?: { value: string; label: string }[];
  rows?: number;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  required = false,
  error,
  hint,
  disabled = false,
  min,
  max,
  step,
  options,
  rows = 3,
  onChange,
  children,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const hasError = !!error;

  const inputClasses = `modern-input-surface block w-full rounded-lg border px-3 py-2.5 text-sm transition-colors ${
    hasError
      ? 'border-brand-danger bg-red-50/50 focus:border-brand-danger focus:ring-2 focus:ring-brand-danger/10'
      : 'border-brand-line bg-brand-surface focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/10'
  } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`;

  const describedBy = [
    hasError ? errorId : null,
    hint ? hintId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1.5 ${hasError ? 'field-error' : ''}`}>
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {type === 'select' ? (
        <select
          id={id}
          name={name}
          className={inputClasses}
          defaultValue={defaultValue}
          value={value}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        >
          <option value="">{placeholder || 'Select...'}</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          className={inputClasses}
          defaultValue={defaultValue}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          className={inputClasses}
          defaultValue={defaultValue}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
      )}

      {children}

      {hasError && (
        <p id={errorId} className="field-error-message flex items-center gap-1" role="alert">
          <Icon name="alert-circle" className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {hint && !hasError && (
        <p id={hintId} className="text-[11px] text-brand-muted">{hint}</p>
      )}
    </div>
  );
}

/**
 * Validates a form field value against simple rules.
 * Returns error string or null if valid.
 */
export function validateField(
  value: string | undefined | null,
  rules: {
    required?: boolean | string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: { regex: RegExp; message: string };
  },
): string | null {
  const v = value?.trim() ?? '';

  if (rules.required && !v) {
    return typeof rules.required === 'string' ? rules.required : 'This field is required';
  }

  if (!v) return null; // Empty + not required = OK

  if (rules.minLength && v.length < rules.minLength) {
    return `Minimum ${rules.minLength} characters`;
  }

  if (rules.maxLength && v.length > rules.maxLength) {
    return `Maximum ${rules.maxLength} characters`;
  }

  const num = Number(v);
  if (rules.min !== undefined && !isNaN(num) && num < rules.min) {
    return `Must be at least ${rules.min}`;
  }

  if (rules.max !== undefined && !isNaN(num) && num > rules.max) {
    return `Must be at most ${rules.max}`;
  }

  if (rules.pattern && !rules.pattern.regex.test(v)) {
    return rules.pattern.message;
  }

  return null;
}
