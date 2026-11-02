import { Icon, IconChip, SectionHeader } from '../../components/ui';
import type { IncomeSummary, MonthSummary } from '../../domain/calc';
import { addMonths, formatShortDate, monthName, parseMonthId, type MonthId } from '../../domain/dates';
import { formatPeso } from '../../domain/money';
import type { Account } from '../../domain/types';

interface IncomeSectionProps {
  monthId: MonthId;
  summary: MonthSummary;
  accountById: Map<string, Account>;
  /** Normal months: add a payday. One-month-ahead months: add a payday that funds next month. */
  onAdd: () => void;
  /** One-month-ahead months: add other money already in hand for this month. */
  onAddMoney: () => void;
  onEdit: (income: IncomeSummary) => void;
  onReceive: (income: IncomeSummary) => void;
}

const nameOf = (m: MonthId) => monthName(parseMonthId(m).monthIndex);

export function IncomeSection({ monthId, summary, accountById, onAdd, onAddMoney, onEdit, onReceive }: IncomeSectionProps) {
  const row = (s: IncomeSummary) => {
    const account = s.income.accountId ? accountById.get(s.income.accountId) : undefined;
    const details = [s.income.expectedDate && formatShortDate(s.income.expectedDate), account?.name].filter(Boolean).join(' · ');
    const inHand = s.income.source !== 'regular';
    return (
      <li key={s.income.id} className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => onEdit(s)} className="flex min-h-11 min-w-0 items-center gap-3 text-left">
          <IconChip icon={inHand || s.isReceived ? 'check_circle' : 'schedule'} tone={inHand || s.isReceived ? 'primary' : 'neutral'} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-headline text-sm font-semibold">{s.income.name}</span>
            <span className="block truncate text-xs text-on-surface-variant">{details || (inHand ? 'Already in hand' : 'Expected income')}</span>
          </span>
        </button>
        <div className="shrink-0 text-right">
          <p className="font-headline text-sm font-bold">{formatPeso(s.isReceived ? s.received : s.income.expected)}</p>
          {inHand ? null : s.isReceived ? (
            <button type="button" onClick={() => onReceive(s)} className="inline-flex min-h-11 items-center text-xs font-semibold text-primary">
              {s.received === s.income.expected ? 'Received' : `Expected ${formatPeso(s.income.expected)}`}
            </button>
          ) : (
            <button type="button" onClick={() => onReceive(s)} className="inline-flex min-h-11 items-center text-xs font-bold text-primary hover:underline">
              Mark received
            </button>
          )}
        </div>
      </li>
    );
  };

  const addButton = (label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-1 px-1 text-primary hover:underline">
      <Icon name="add" size={16} /> {label}
    </button>
  );

  // ---- Normal month: paydays fund this month -------------------------------------------------
  if (!summary.funding) {
    return (
      <section className="space-y-2.5">
        <SectionHeader title="Income" icon="payments" iconTone="primary" action={addButton('Add income', onAdd)} />
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
            <ul className="divide-y divide-surface-container">{summary.income.map(row)}</ul>
          )}
        </div>
      </section>
    );
  }

  // ---- One month ahead: last month's paydays fund this month; this month's fund next month ----
  const { funding, earnings } = summary;
  const inHand = summary.income.filter((s) => s.income.source !== 'regular');
  const paydays = summary.income.filter((s) => s.income.source === 'regular');
  const stillExpected = Math.max(funding.funds - funding.received, 0);
  const thisMonth = nameOf(monthId);
  const next = nameOf(addMonths(monthId, 1));

  return (
    <section className="space-y-2.5">
      <SectionHeader title={`Money for ${thisMonth}`} icon="payments" iconTone="primary" action={addButton('Add money', onAddMoney)} />
      <div className="overflow-hidden rounded-xl bg-surface-container-low shadow-soft">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-headline text-sm font-semibold">From {nameOf(funding.fromMonth)}'s paydays</p>
            <p className="text-xs text-on-surface-variant">
              {funding.expected === 0
                ? `No paydays were recorded in ${nameOf(funding.fromMonth)}`
                : stillExpected > 0
                  ? `${formatPeso(funding.received)} received · ${formatPeso(stillExpected)} still expected`
                  : 'All received'}
            </p>
          </div>
          <p className="shrink-0 font-headline text-sm font-bold">{formatPeso(funding.funds)}</p>
        </div>
        {inHand.length > 0 && <ul className="divide-y divide-surface-container border-t border-surface-container">{inHand.map(row)}</ul>}
        {summary.extraIncome > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-surface-container px-4 py-3 text-sm">
            <span className="text-on-surface-variant">Extra income this month</span>
            <span className="font-headline font-bold">{formatPeso(summary.extraIncome)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-outline-variant/50 px-4 py-3 text-sm font-bold">
          <span>Total for {thisMonth}</span>
          <span className="font-headline">{formatPeso(summary.plannedIncome + summary.extraIncome)}</span>
        </div>
      </div>

      <SectionHeader title={`Earned in ${thisMonth} → for ${next}`} action={addButton('Add payday', onAdd)} />
      <div className="overflow-hidden rounded-xl bg-surface-container-low shadow-soft">
        <div className="border-b border-surface-container px-4 py-3 text-sm text-on-surface-variant">
          {next}'s budget so far: <span className="font-bold text-primary">{formatPeso(earnings?.received ?? 0)}</span> of {formatPeso(earnings?.expected ?? 0)}
        </div>
        {paydays.length === 0 ? (
          <p className="px-4 py-3 text-sm text-on-surface-variant">No paydays yet. Add your salary cutoffs and sideline.</p>
        ) : (
          <ul className="divide-y divide-surface-container">{paydays.map(row)}</ul>
        )}
      </div>
    </section>
  );
}
