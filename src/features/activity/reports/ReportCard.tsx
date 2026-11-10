import { useState, type ReactNode } from 'react';
import { Icon } from '../../../components/ui';

interface ReportCardProps {
  title: string;
  subtitle?: string;
  /** When given, the card shows a Chart / Table toggle. */
  table?: ReactNode;
  children: ReactNode;
}

export function ReportCard({ title, subtitle, table, children }: ReportCardProps) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="min-w-0 space-y-4 rounded-xl bg-surface-container-low p-4 shadow-soft sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-on-surface-variant">{subtitle}</p>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            aria-pressed={showTable}
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-primary hover:bg-surface-container"
          >
            <Icon name={showTable ? 'bar_chart' : 'receipt_long'} size={16} />
            {showTable ? 'Chart' : 'Table'}
          </button>
        )}
      </header>
      {showTable && table ? <div className="-mx-1 overflow-x-auto px-1">{table}</div> : children}
    </section>
  );
}

/** Plain data table shared by reports (numbers right-aligned, tabular). */
export function DataTable({ head, rows, foot }: { head: string[]; rows: ReactNode[][]; foot?: ReactNode[] }) {
  return (
    <table className="w-full min-w-[20rem] text-sm">
      <thead>
        <tr className="border-b border-outline-variant/60 text-xs text-on-surface-variant">
          {head.map((h, i) => (
            <th key={h} scope="col" className={`py-2 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-surface-container last:border-0">
            {r.map((c, j) => (
              <td key={j} className={`py-2 ${j === 0 ? 'text-left' : 'text-right tabular-nums'}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {foot && (
        <tfoot>
          <tr className="border-t border-outline-variant/60 font-bold">
            {foot.map((c, j) => (
              <td key={j} className={`py-2 ${j === 0 ? 'text-left' : 'text-right tabular-nums'}`}>
                {c}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}
