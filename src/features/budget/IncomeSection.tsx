import { Icon, IconChip, SectionHeader } from '../../components/ui';
import type { IncomeSummary, MonthSummary } from '../../domain/calc';
import { formatShortDate } from '../../domain/dates';
import { formatPeso } from '../../domain/money';
import type { Account } from '../../domain/types';

interface IncomeSectionProps {
  summary: MonthSummary;
  accountById: Map<string, Account>;
  onAdd: () => void;
  onEdit: (income: IncomeSummary) => void;
  onReceive: (income: IncomeSummary) => void;
}

export function IncomeSection({ summary, accountById, onAdd, onEdit, onReceive }: IncomeSectionProps) {
  return (
    <section className="space-y-2.5">
      <SectionHeader
        title="Income"
        icon="payments"
        iconTone="primary"
        action={
          <button type="button" onClick={onAdd} className="inline-flex min-h-11 items-center gap-1 px-1 text-primary hover:underline">
            <Icon name="add" size={16} /> Add income
          </button>
        }
      />
      <div className="overflow-hidden rounded-xl bg-surface-container-low shadow-soft">
        <div className="flex items-baseline justify-between gap-2 border-b border-surface-container px-4 py-3">
          <span className="text-sm text-on-surface-variant">
            Received <span className="font-bold text-primary">{formatPeso(summary.incomeReceived)}</span> of {formatPeso(summary.plannedIncome)} expected
          </span>
          {summary.extraIncome > 0 && <span className="text-xs text-on-surface-variant">incl. {formatPeso(summary.extraIncome)} extra</span>}
        </div>
        {summary.income.length === 0 ? (
          <p className="px-4 py-3 text-sm text-on-surface-variant">No income lines yet. Add your salary cutoffs and other expected income.</p>
        ) : (
          <ul className="divide-y divide-surface-container">
            {summary.income.map((s) => {
              const account = s.income.accountId ? accountById.get(s.income.accountId) : undefined;
              const details = [s.income.expectedDate && formatShortDate(s.income.expectedDate), account?.name].filter(Boolean).join(' · ');
              return (
                <li key={s.income.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <button type="button" onClick={() => onEdit(s)} className="flex min-w-0 items-center gap-3 text-left">
                    <IconChip icon={s.isReceived ? 'check_circle' : 'schedule'} tone={s.isReceived ? 'primary' : 'neutral'} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-headline text-sm font-semibold">{s.income.name}</span>
                      <span className="block truncate text-xs text-on-surface-variant">{details || 'Expected income'}</span>
                    </span>
                  </button>
                  <div className="shrink-0 text-right">
                    <p className="font-headline text-sm font-bold">{formatPeso(s.isReceived ? s.received : s.income.expected)}</p>
                    {s.isReceived ? (
                      <button type="button" onClick={() => onReceive(s)} className="text-xs font-semibold text-primary">
                        {s.received === s.income.expected ? 'Received' : `Expected ${formatPeso(s.income.expected)}`}
                      </button>
                    ) : (
                      <button type="button" onClick={() => onReceive(s)} className="inline-flex min-h-8 items-center text-xs font-bold text-primary hover:underline">
                        Mark received
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
