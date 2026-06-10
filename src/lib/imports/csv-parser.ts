/**
 * Lightweight CSV parser for bulk imports.
 * Handles quoted fields, newlines in quotes, and common edge cases.
 */
export interface ParseResult<T = Record<string, string>> {
  rows: T[];
  headers: string[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

export function parseCsv(text: string): ParseResult {
  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    return { rows: [], headers: [], errors: ['File must have at least a header row and one data row.'], totalRows: 0, validRows: 0 };
  }

  const headers = parseRow(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows: Record<string, string>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseRow(line);
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: expected ${headers.length} columns, got ${values.length}`);
      continue;
    }

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j].trim();
    }
    rows.push(row);
  }

  return {
    rows,
    headers,
    errors,
    totalRows: lines.length - 1,
    validRows: rows.length,
  };
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

/**
 * Validate required fields exist in parsed CSV data.
 */
export function validateRequiredFields(
  headers: string[],
  requiredFields: string[],
): string[] {
  const missing = requiredFields.filter((field) => !headers.includes(field));
  return missing.map((field) => `Missing required column: "${field}"`);
}

/**
 * Import template definitions.
 */
export const IMPORT_TEMPLATES = {
  loans: {
    label: 'Loans',
    description: 'Import loan records',
    requiredFields: ['borrower_name', 'principal', 'interest_rate', 'term_months', 'disbursement_date'],
    optionalFields: ['contact', 'collateral_desc', 'collateral_value', 'origination_fee', 'status'],
    sampleRow: 'John Doe,50000,24,12,2026-01-15,borrower@example.com,Vehicle,60000,500,ACTIVE',
  },
  investors: {
    label: 'Investors',
    description: 'Import investor records',
    requiredFields: ['name', 'contact'],
    optionalFields: ['class', 'notes'],
    sampleRow: 'Investor A,investor@example.com,CLASS_A,Initial investor',
  },
  contributions: {
    label: 'Contributions',
    description: 'Import investor contributions',
    requiredFields: ['investor_name', 'amount', 'date_received', 'cycle_no'],
    optionalFields: ['notes'],
    sampleRow: 'Investor A,100000,2026-01-01,1,Cycle 1 contribution',
  },
  market_holdings: {
    label: 'Market Holdings',
    description: 'Import market portfolio holdings',
    requiredFields: ['instrument_type', 'name', 'amount_invested', 'current_value', 'purchase_date'],
    optionalFields: ['return_rate', 'maturity_date'],
    sampleRow: 'GSE_EQUITY,MTN Ghana,15000,16200,2026-01-10,8,',
  },
} as const;

export type ImportType = keyof typeof IMPORT_TEMPLATES;
