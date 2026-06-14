import { describe, expect, it } from 'vitest';

import { IMPORT_TEMPLATES, parseCsv, validateRequiredFields } from '../csv-parser';

describe('parseCsv', () => {
  it('normalizes headers and trims row values', () => {
    const result = parseCsv('Borrower Name, Principal ,Interest Rate\n Ada Ltd , 50000 ,24');

    expect(result.headers).toEqual(['borrower_name', 'principal', 'interest_rate']);
    expect(result.rows).toEqual([
      {
        borrower_name: 'Ada Ltd',
        principal: '50000',
        interest_rate: '24',
      },
    ]);
    expect(result.errors).toEqual([]);
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toBe(1);
  });

  it('handles quoted commas, escaped quotes, and quoted newlines', () => {
    const csv = [
      'name,notes,amount',
      '"Partner, Alpha","Line one',
      'Line two with ""quoted"" text",100000',
    ].join('\n');

    const result = parseCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        name: 'Partner, Alpha',
        notes: 'Line one\nLine two with "quoted" text',
        amount: '100000',
      },
    ]);
  });

  it('reports row width mismatches without importing invalid rows', () => {
    const result = parseCsv('name,amount\nPartner A,100000\nPartner B');

    expect(result.rows).toEqual([{ name: 'Partner A', amount: '100000' }]);
    expect(result.errors).toEqual(['Row 3: expected 2 columns, got 1']);
    expect(result.totalRows).toBe(2);
    expect(result.validRows).toBe(1);
  });

  it('rejects files without both headers and data rows', () => {
    const result = parseCsv('name,amount');

    expect(result.rows).toEqual([]);
    expect(result.headers).toEqual([]);
    expect(result.errors).toEqual(['File must have at least a header row and one data row.']);
  });
});

describe('validateRequiredFields', () => {
  it('returns missing required import columns', () => {
    const errors = validateRequiredFields(['borrower_name', 'principal'], IMPORT_TEMPLATES.loans.requiredFields);

    expect(errors).toEqual([
      'Missing required column: "interest_rate"',
      'Missing required column: "term_months"',
      'Missing required column: "disbursement_date"',
    ]);
  });
});
