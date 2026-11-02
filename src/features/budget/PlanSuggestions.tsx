import { Icon } from '../../components/ui';
import { useLookups, useMonthRange } from '../../db/hooks';
import { applyPlanSuggestion } from '../../db/repo/budgetItems';
import { dismissSuggestion } from '../../db/repo/settings';
import { addMonths, currentMonthId, type MonthId } from '../../domain/dates';
import { formatPeso } from '../../domain/money';
import { planSuggestions } from '../../domain/suggestions';
import type { BudgetItem } from '../../domain/types';
import { useUi } from '../../state/ui';

interface PlanSuggestionsProps {
  monthId: MonthId;
  items: BudgetItem[];
}

/** "You usually spend more/less than planned" — based on the last 3 started months. */
export function PlanSuggestions({ monthId, items }: PlanSuggestionsProps) {
  const { showToast } = useUi();
  const lookups = useLookups();
  const past = useMonthRange(addMonths(monthId, -1), 3);
  if (!past || !lookups) return null;

  // Only finished months teach anything: a month still in progress (or not fully tracked yet) would drag averages down.
  const thisMonth = currentMonthId();
  const history = past.filter((p) => p.started && p.monthId < thisMonth).reverse().map((p) => p.summary.items);
  const dismissed = new Set(lookups.settings.dismissedSuggestions ?? []);
  const suggestions = planSuggestions(items, history).filter((s) => !dismissed.has(s.itemId)).slice(0, 3);
  if (suggestions.length === 0) return null;

  return (
    <section className="space-y-2 rounded-xl bg-tertiary-fixed/50 p-4 shadow-soft">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-on-tertiary-fixed">
        <Icon name="spa" size={18} /> Suggestions from your last months
      </h3>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li key={s.itemId} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-lowest/80 px-3 py-2">
            <p className="min-w-0 text-sm">
              <strong>{s.name}</strong>: you usually spend about {formatPeso(s.average)}, plan is {formatPeso(s.planned)}.
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  void applyPlanSuggestion(s.itemId, s.suggested).then(() => showToast(`${s.name} planned at ${formatPeso(s.suggested)} from now on`))
                }
                className="inline-flex min-h-10 items-center rounded-full bg-primary px-3 text-xs font-bold text-on-primary"
              >
                Use {formatPeso(s.suggested)}
              </button>
              <button type="button" onClick={() => void dismissSuggestion(s.itemId)} aria-label={`Dismiss suggestion for ${s.name}`} className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
                <Icon name="close" size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
