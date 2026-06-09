export function DataTable({
  headers,
  rows,
  maxHeight = 'max-h-80',
}: {
  headers: string[];
  rows: React.ReactNode[][];
  maxHeight?: string;
}) {
  return (
    <div className={`${maxHeight} overflow-auto rounded-md border border-brand-silver`}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-brand-silver text-xs uppercase tracking-wide text-brand-muted">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-5 text-brand-muted" colSpan={headers.length}>
                No records.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-b border-brand-surface-muted last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2.5 align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
