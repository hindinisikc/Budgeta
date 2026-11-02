import { Link } from 'react-router';
import { Button, EmptyState, FormError } from '../../components/ui';
import { startMonth } from '../../db/repo/months';
import { addMonths, formatMonthLabel, monthName, parseMonthId, type MonthId } from '../../domain/dates';
import type { Template } from '../../domain/types';
import { useAction } from '../../state/useAction';
import { useLookups } from '../../db/hooks';

interface StartMonthCardProps {
  monthId: MonthId;
  templates: Template[];
}

/** Shown when the selected month hasn't been started yet. */
export function StartMonthCard({ monthId, templates }: StartMonthCardProps) {
  const { busy, error, run } = useAction();
  const aheadMode = useLookups()?.settings.incomeTiming === 'next-month';
  const prevName = monthName(parseMonthId(addMonths(monthId, -1)).monthIndex);
  const active = templates.filter((t) => t.active);
  const bills = active.filter((t) => t.kind === 'bill').length;
  const pools = active.filter((t) => t.kind === 'flexible').length;
  const income = active.filter((t) => t.kind === 'income').length;
  const parts = [
    bills && `${bills} bill${bills === 1 ? '' : 's'}`,
    pools && `${pools} spending pool${pools === 1 ? '' : 's'}`,
    income && `${income} income line${income === 1 ? '' : 's'}`,
  ].filter(Boolean);

  const start = (fromTemplates: boolean) => void run(async () => void (await startMonth(monthId, { fromTemplates })));

  return (
    <>
      <EmptyState
        icon="event_repeat"
        title={`Start ${formatMonthLabel(monthId)}`}
        message={
          (active.length > 0
            ? `Your recurring list will add ${parts.join(', ')}. You can adjust any amount afterwards.`
            : 'You have no recurring items yet. Set them up once (rent, bills, salary) and every new month starts pre-filled.') +
          (aheadMode ? ` This month will run on ${prevName}'s paydays.` : '')
        }
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            {active.length > 0 ? (
              <Button icon="event_repeat" disabled={busy} onClick={() => start(true)}>
                Start with recurring items
              </Button>
            ) : (
              <Link
                to="/budget/recurring"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary shadow-fab"
              >
                Set up recurring items
              </Link>
            )}
            <Button variant="secondary" disabled={busy} onClick={() => start(false)}>
              Start empty
            </Button>
          </div>
        }
      />
      <FormError message={error} />
    </>
  );
}
