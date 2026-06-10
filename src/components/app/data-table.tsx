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
    <div className={`${maxHeight} overflow-auto rounded-md border border-brand-line bg-white`}>
      <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
        <thead className="sticky top-0 z-10 bg-brand-panel">
          <tr className="border-b border-brand-line text-[10px] uppercase text-brand-muted">
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-sm text-brand-muted" colSpan={headers.length}>
                No records.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-b border-brand-line last:border-0 hover:bg-brand-panel">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 align-middle">
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
