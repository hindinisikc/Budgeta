import { useState } from 'react';
import { Link } from 'react-router';
import { Badge, Icon, IconChip, PageHeading, SectionHeader, toIconName } from '../../../components/ui';
import { useLookups, useTemplates } from '../../../db/hooks';
import { formatPeso, sum } from '../../../domain/money';
import type { Template } from '../../../domain/types';
import { StarterChecklist } from './StarterChecklist';
import { TemplateEditorSheet } from './TemplateEditorSheet';

const GROUPS: Array<{ kind: Template['kind']; title: string; empty: string }> = [
  { kind: 'income', title: 'Income', empty: 'e.g. salary cutoffs, allowance received' },
  { kind: 'bill', title: 'Bills', empty: 'e.g. rent, internet, loans, tuition' },
  { kind: 'flexible', title: 'Spending pools', empty: 'e.g. groceries, transport, laundry' },
];

/** The recurring list ("templates") copied into each new month. */
export function RecurringPage() {
  const templates = useTemplates();
  const lookups = useLookups();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [newKind, setNewKind] = useState<Template['kind']>('bill');
  const [skipStarter, setSkipStarter] = useState(false);

  const edit = (t: Template | null, kind: Template['kind'] = 'bill') => {
    setEditing(t);
    setNewKind(kind);
    setOpen(true);
  };

  const active = templates?.filter((t) => t.active) ?? [];
  const income = sum(active.filter((t) => t.kind === 'income').map((t) => t.defaultAmount));
  const expenses = sum(active.filter((t) => t.kind !== 'income').map((t) => t.defaultAmount));

  return (
    <>
      <Link to="/budget" className="-mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">
        <Icon name="arrow_back" size={18} /> Budget
      </Link>
      <PageHeading title="Recurring" />
      {templates?.length === 0 && !skipStarter ? (
        <StarterChecklist onSkip={() => setSkipStarter(true)} />
      ) : (
        <p className="text-sm text-on-surface-variant">
          These items are copied into each month you start. Typical month: <strong className="text-on-surface">{formatPeso(income)}</strong> income,{' '}
          <strong className="text-on-surface">{formatPeso(expenses)}</strong> planned spending.
        </p>
      )}

      <div className={templates?.length === 0 && !skipStarter ? 'hidden' : 'grid items-start gap-6 lg:grid-cols-3'}>
        {GROUPS.map((g) => {
          const list = templates?.filter((t) => t.kind === g.kind) ?? [];
          return (
            <section key={g.kind} className="min-w-0 space-y-2.5">
              <SectionHeader
                title={g.title}
                action={
                  <button type="button" onClick={() => edit(null, g.kind)} className="inline-flex min-h-11 items-center gap-1 px-1 text-primary hover:underline">
                    <Icon name="add" size={16} /> Add
                  </button>
                }
              />
              <div className="divide-y divide-surface-container overflow-hidden rounded-xl bg-surface-container-low shadow-soft">
                {list.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-on-surface-variant">None yet — {g.empty}.</p>
                ) : (
                  list.map((t) => {
                    const category = t.categoryId ? lookups?.categoryById.get(t.categoryId) : undefined;
                    const account = t.accountId ? lookups?.accountById.get(t.accountId) : undefined;
                    const details = [t.dueDay && `Day ${t.dueDay}`, account?.name, t.autoPay && 'Auto-debit'].filter(Boolean).join(' · ');
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => edit(t)}
                        className={`flex w-full items-center justify-between gap-3 p-3.5 text-left transition-colors hover:bg-surface-container/40 ${t.active ? '' : 'opacity-60'}`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <IconChip icon={g.kind === 'income' ? 'payments' : toIconName(category?.icon ?? 'category')} size="sm" shape="rounded" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-headline text-sm font-semibold">{t.name}</span>
                              {!t.active && <Badge>Paused</Badge>}
                            </span>
                            <span className="block truncate text-xs text-on-surface-variant">{details || category?.name || ' '}</span>
                          </span>
                        </span>
                        <span className="shrink-0 font-headline text-sm font-bold">{formatPeso(t.defaultAmount)}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {lookups && (
        <TemplateEditorSheet
          open={open}
          onClose={() => setOpen(false)}
          template={editing}
          defaultKind={newKind}
          categories={lookups.categories}
          accounts={lookups.accounts}
        />
      )}
    </>
  );
}
