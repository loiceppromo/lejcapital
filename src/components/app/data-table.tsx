'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { Icon } from './icon';

export function DataTable({
  headers,
  rows,
  maxHeight = 'max-h-80',
  sortable = true,
  paginated = true,
  initialPageSize = 10,
}: {
  headers: string[];
  rows: ReactNode[][];
  maxHeight?: string;
  sortable?: boolean;
  paginated?: boolean;
  initialPageSize?: 10 | 25 | 50;
}) {
  const [sort, setSort] = useState<{ index: number; direction: 'asc' | 'desc' } | null>(null);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(initialPageSize);
  const [page, setPage] = useState(1);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const aValue = getSortValue(a[sort.index]);
      const bValue = getSortValue(b[sort.index]);

      const aNumber = parseNumericValue(aValue);
      const bNumber = parseNumericValue(bValue);
      const result = aNumber !== null && bNumber !== null
        ? aNumber - bNumber
        : aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });

      return sort.direction === 'asc' ? result : -result;
    });
  }, [rows, sort]);

  const shouldPaginate = paginated && sortedRows.length > pageSize;
  const totalPages = shouldPaginate ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const visibleRows = shouldPaginate
    ? sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedRows;
  const startRow = sortedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = shouldPaginate ? Math.min(currentPage * pageSize, sortedRows.length) : sortedRows.length;

  function toggleSort(index: number) {
    if (!sortable) return;
    setPage(1);
    setSort((current) => {
      if (!current || current.index !== index) return { index, direction: 'asc' };
      if (current.direction === 'asc') return { index, direction: 'desc' };
      return null;
    });
  }

  return (
    <div className="modern-section overflow-hidden rounded-xl border border-brand-line bg-brand-panel shadow-sm">
      {visibleRows.length === 0 ? (
        <EmptyState description="No rows match the current view." />
      ) : (
      <>
        {sortable ? (
          <div className="flex items-center justify-between gap-3 border-b border-brand-line bg-brand-surface px-4 py-3 lg:hidden">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-brand-muted">
              <span className="shrink-0 font-semibold uppercase">Sort</span>
              <select
                value={sort ? String(sort.index) : ''}
                onChange={(event) => {
                  setPage(1);
                  setSort(event.target.value === '' ? null : { index: Number(event.target.value), direction: sort?.direction ?? 'asc' });
                }}
                className="min-w-0 flex-1 rounded-lg border border-brand-line bg-brand-panel px-2 py-1.5 text-xs text-brand-black"
              >
                <option value="">Default order</option>
                {headers.map((header, index) => (
                  <option key={header} value={index}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setSort((current) => current ? { ...current, direction: current.direction === 'asc' ? 'desc' : 'asc' } : current)}
              disabled={!sort}
              className="rounded-lg border border-brand-line bg-brand-panel px-2.5 py-1.5 text-xs font-semibold text-brand-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sort?.direction === 'desc' ? 'Desc' : 'Asc'}
            </button>
          </div>
        ) : null}

        {/* Desktop: traditional table */}
        <div className={`hidden lg:block ${maxHeight} overflow-auto`}>
          <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-brand-surface/95 backdrop-blur-sm">
              <tr className="border-b border-brand-line text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                {headers.map((header, index) => {
                  const active = sort?.index === index;
                  return (
                    <th key={header} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(index)}
                          className={`flex items-center gap-1 text-left uppercase tracking-[0.18em] hover:text-brand-black ${
                            active ? 'text-brand-accent font-bold' : 'text-brand-muted'
                          }`}
                          aria-label={`Sort by ${header}`}
                        >
                          <span>{header}</span>
                          <span className="inline-flex w-3 justify-center text-[9px]">
                            <Icon
                              name={active ? (sort.direction === 'asc' ? 'chevron-up' : 'chevron-down') : 'sort'}
                              className="h-3 w-3"
                            />
                          </span>
                        </button>
                      ) : (
                        header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                  <tr
                    key={`${currentPage}-${index}`}
                    className={`border-b border-brand-line/55 last:border-0 transition-colors hover:bg-brand-accent/[0.06] ${
                      index % 2 === 1 ? 'bg-brand-surface/35' : ''
                    }`}
                  >
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} data-density-cell className="px-4 py-3 align-middle">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: card list */}
        <div className={`block lg:hidden ${maxHeight} overflow-auto divide-y divide-brand-line`}>
          {visibleRows.map((row, rowIndex) => (
            <div key={`mobile-${currentPage}-${rowIndex}`} className="space-y-2 px-4 py-4 transition-colors hover:bg-brand-panel/50">
              {row.map((cell, cellIndex) => (
                <div key={cellIndex} className="flex items-start justify-between gap-2">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                    {headers[cellIndex]}
                  </span>
                  <span className="text-right text-[13px]">{cell}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
      )}

      {paginated && sortedRows.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-brand-line bg-brand-surface px-4 py-3 text-xs text-brand-muted lg:flex-row lg:items-center lg:justify-between">
          <p className="font-medium">
            Showing <span className="text-brand-charcoal">{startRow}-{endRow}</span> of <span className="text-brand-charcoal">{sortedRows.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as 10 | 25 | 50);
                  setPage(1);
                }}
                className="rounded-lg border border-brand-line bg-brand-panel px-2 py-1.5 text-brand-black"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              title="Previous page"
              className="rounded-lg border border-brand-line bg-brand-panel px-2.5 py-1.5 font-semibold text-brand-charcoal hover:border-brand-accent hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-brand-line disabled:hover:text-brand-charcoal"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <span className="min-w-16 text-center font-medium">
              <span className="text-brand-charcoal">{currentPage}</span> / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              title="Next page"
              className="rounded-lg border border-brand-line bg-brand-panel px-2.5 py-1.5 font-semibold text-brand-charcoal hover:border-brand-accent hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-brand-line disabled:hover:text-brand-charcoal"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getSortValue(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return String(node);
  if (Array.isArray(node)) return node.map(getSortValue).join(' ');
  if (typeof node === 'object' && 'props' in node) {
    const element = node as { props?: { children?: ReactNode; title?: string; 'aria-label'?: string } };
    return getSortValue(element.props?.children ?? element.props?.title ?? element.props?.['aria-label'] ?? '');
  }
  return '';
}

function parseNumericValue(value: string): number | null {
  const cleaned = value.replace(/GHS|,/gi, '').trim();
  if (!/^-?\d+(\.\d+)?x?$/.test(cleaned)) return null;
  const numeric = Number(cleaned.replace(/x$/i, ''));
  return Number.isFinite(numeric) ? numeric : null;
}
