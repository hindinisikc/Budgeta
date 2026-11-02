import { SectionHeader, Toggle } from '../../components/ui';
import { useLookups } from '../../db/hooks';
import { setIncomeTiming } from '../../db/repo/settings';
import { addMonths, currentMonthId, formatMonthLabel } from '../../domain/dates';
import { useUi } from '../../state/ui';

/** Settings → "Live one month ahead": each month runs on the previous month's paydays. */
export function IncomeTimingSection() {
  const lookups = useLookups();
  const { showToast } = useUi();
  if (!lookups) return null;
  const on = lookups.settings.incomeTiming === 'next-month';
  const current = currentMonthId();
  const next = formatMonthLabel(addMonths(current, 1));

  return (
    <section className="min-w-0 space-y-2.5">
      <SectionHeader title="Income timing" />
      <div className="space-y-3 rounded-xl bg-surface-container-low p-4 shadow-soft">
        <Toggle
          checked={on}
          onChange={(v) =>
            void setIncomeTiming(v ? 'next-month' : 'same-month', current).then(() =>
              showToast(v ? `Months from ${next} will run on the previous month's paydays` : 'Paydays fund their own month again'),
            )
          }
          label="Live one month ahead"
          description="Each month runs on the money you earned the month before. Paydays you receive count toward next month."
        />
        <p className="text-xs text-on-surface-variant">
          Applies to months you start from now on (and to future months already started), so {formatMonthLabel(current)} stays as it is.
        </p>
      </div>
    </section>
  );
}
