import { describe, it, expect } from 'vitest';
import { buildCsv, type CsvColumn } from '../csv';

interface Row {
  name: string;
  amount: number;
  note: string;
}

const columns: CsvColumn<Row>[] = [
  { header: 'Name', value: (r) => r.name },
  { header: 'Amount', value: (r) => r.amount.toFixed(2) },
  { header: 'Note', value: (r) => r.note },
];

describe('buildCsv', () => {
  it('produces header + data rows', () => {
    const rows: Row[] = [
      { name: 'Alpha', amount: 100, note: 'ok' },
      { name: 'Beta', amount: 250.5, note: 'fine' },
    ];

    const csv = buildCsv(columns, rows);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Name,Amount,Note');
    expect(lines[1]).toBe('Alpha,100.00,ok');
    expect(lines[2]).toBe('Beta,250.50,fine');
  });

  it('escapes commas in cell values', () => {
    const rows: Row[] = [{ name: 'Hello, World', amount: 10, note: 'x' }];
    const csv = buildCsv(columns, rows);
    expect(csv).toContain('"Hello, World"');
  });

  it('escapes quotes in cell values', () => {
    const rows: Row[] = [{ name: 'He said "yes"', amount: 0, note: '' }];
    const csv = buildCsv(columns, rows);
    expect(csv).toContain('"He said ""yes"""');
  });

  it('handles empty rows', () => {
    const csv = buildCsv(columns, []);
    expect(csv).toBe('Name,Amount,Note');
  });

  it('escapes newlines in cell values', () => {
    const rows: Row[] = [{ name: 'Line1\nLine2', amount: 5, note: 'ok' }];
    const csv = buildCsv(columns, rows);
    expect(csv).toContain('"Line1\nLine2"');
  });

  it('neutralizes spreadsheet formula injection prefixes', () => {
    const rows: Row[] = [
      { name: '=IMPORTXML("https://example.com")', amount: 1, note: '+cmd' },
      { name: '-10 is text', amount: 2, note: '@hidden' },
      { name: '  =SUM(1,2)', amount: 3, note: 'safe text' },
    ];

    const csv = buildCsv(columns, rows);

    expect(csv).toContain('\'=IMPORTXML');
    expect(csv).toContain('\'+cmd');
    expect(csv).toContain('\'-10 is text');
    expect(csv).toContain('\'@hidden');
    expect(csv).toContain('"\'  =SUM(1,2)"');
  });
});
