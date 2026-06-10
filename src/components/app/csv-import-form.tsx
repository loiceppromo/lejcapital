'use client';

import { useState, useRef, useCallback, type ChangeEvent } from 'react';
import { parseCsv, validateRequiredFields, IMPORT_TEMPLATES, type ImportType } from '@/lib/imports/csv-parser';

interface CsvImportFormProps {
  onImport: (type: ImportType, rows: Record<string, string>[]) => Promise<{ success: boolean; message: string }>;
}

export function CsvImportForm({ onImport }: CsvImportFormProps) {
  const [importType, setImportType] = useState<ImportType>('loans');
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const template = IMPORT_TEMPLATES[importType];

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      setStatus({ type: 'idle', message: '' });
      setPreview(null);
      setErrors([]);

      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.csv')) {
        setErrors(['File must be a CSV file (.csv)']);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors(['File is too large. Maximum size is 5 MB.']);
        return;
      }

      const text = await file.text();
      const result = parseCsv(text);

      const validationErrors = [
        ...result.errors,
        ...validateRequiredFields(result.headers, [...template.requiredFields]),
      ];

      setHeaders(result.headers);
      setErrors(validationErrors);

      if (validationErrors.length === 0 && result.rows.length > 0) {
        setPreview(result.rows.slice(0, 5));
        setStatus({
          type: 'idle',
          message: `Parsed ${result.validRows} valid rows of ${result.totalRows} total. Preview shows first 5.`,
        });
      } else if (result.rows.length === 0 && validationErrors.length === 0) {
        setErrors(['No data rows found in file.']);
      }
    },
    [template.requiredFields],
  );

  const handleImport = useCallback(async () => {
    if (!preview) return;
    setImporting(true);
    try {
      // Re-parse the full file for import
      const file = fileRef.current?.files?.[0];
      if (!file) return;
      const text = await file.text();
      const result = parseCsv(text);
      const response = await onImport(importType, result.rows);
      setStatus({ type: response.success ? 'success' : 'error', message: response.message });
      if (response.success) {
        setPreview(null);
        if (fileRef.current) fileRef.current.value = '';
      }
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Import failed' });
    } finally {
      setImporting(false);
    }
  }, [preview, importType, onImport]);

  const handleDownloadTemplate = useCallback(() => {
    const allFields = [...template.requiredFields, ...template.optionalFields];
    const csv = `${allFields.join(',')}\n${template.sampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lejcapital-${importType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [importType, template]);

  return (
    <div className="space-y-4">
      {/* Import type selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Import type</label>
        <select
          value={importType}
          onChange={(e) => {
            setImportType(e.target.value as ImportType);
            setPreview(null);
            setErrors([]);
            setStatus({ type: 'idle', message: '' });
            if (fileRef.current) fileRef.current.value = '';
          }}
          className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        >
          {Object.entries(IMPORT_TEMPLATES).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label} — {val.description}
            </option>
          ))}
        </select>
      </div>

      {/* Required fields */}
      <div className="rounded-md border border-brand-line bg-brand-panel p-3">
        <p className="text-xs font-semibold text-brand-charcoal">Required columns</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {template.requiredFields.map((field) => (
            <span key={field} className="rounded bg-brand-navy/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-brand-navy">
              {field}
            </span>
          ))}
        </div>
        {template.optionalFields.length > 0 && (
          <>
            <p className="mt-2 text-xs font-semibold text-brand-muted">Optional columns</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {template.optionalFields.map((field) => (
                <span key={field} className="rounded bg-brand-surface px-2 py-0.5 text-[10px] font-mono text-brand-muted">
                  {field}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* File upload + template download */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">CSV file</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-brand-charcoal file:mr-3 file:rounded-md file:border file:border-brand-silver file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-charcoal hover:file:bg-brand-panel"
          />
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="rounded-md border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
        >
          Download template
        </button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-800">Validation errors</p>
          <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {preview && preview.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-brand-line">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-brand-line bg-brand-surface">
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold uppercase text-brand-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-b border-brand-line last:border-0">
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-1.5 text-brand-charcoal">
                      {row[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status message */}
      {status.message && (
        <div
          className={`rounded-md border p-3 text-xs ${
            status.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : status.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-brand-line bg-brand-panel text-brand-charcoal'
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Import button */}
      {preview && errors.length === 0 && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Import data'}
        </button>
      )}
    </div>
  );
}
