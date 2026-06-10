'use client';

import { useCallback } from 'react';
import { CsvImportForm } from './csv-import-form';
import { importCsvData } from '@/app/actions/import';
import type { ImportType } from '@/lib/imports/csv-parser';

export function CsvImportSection({ dbConnected }: { dbConnected: boolean }) {
  const handleImport = useCallback(
    async (type: ImportType, rows: Record<string, string>[]) => {
      return importCsvData(type, rows);
    },
    [],
  );

  if (!dbConnected) {
    return (
      <p className="text-sm text-brand-muted">
        CSV import requires a database connection. Connect to Supabase to enable bulk imports.
      </p>
    );
  }

  return <CsvImportForm onImport={handleImport} />;
}
