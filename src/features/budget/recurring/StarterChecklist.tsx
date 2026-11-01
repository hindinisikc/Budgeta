import { useState } from 'react';
import { Button, FormError, Icon, cx } from '../../../components/ui';
import { addStarterTemplates } from '../../../db/repo/templates';
import { parseAmount } from '../../../domain/money';
import { STARTER_ITEMS } from '../../../domain/suggestions';
import { useUi } from '../../../state/ui';
import { useAction } from '../../../state/useAction';

/** First-run helper: tick the common items that apply and type your own amounts. */
export function StarterChecklist({ onSkip }: { onSkip: () => void }) {
  const { showToast } = useUi();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const { busy, error, setError, run } = useAction();
  const selected = Object.keys(checked).filter((k) => checked[k]);

  const save = () => {
    const missing = selected.filter((k) => !(parseAmount(amounts[k] ?? '') ?? 0));
    if (missing.length) return setError('Enter an amount for every ticked item (you can change it later).');
    void run(async () => {
      const n = await addStarterTemplates(selected.map((key) => ({ key, amount: parseAmount(amounts[key]!)! })));
      showToast(`Added ${n} recurring item${n === 1 ? '' : 's'}`);
    });
  };

  return (
    <section className="space-y-4 rounded-xl bg-surface-container-low p-4 shadow-soft sm:p-5">
      <div>
        <h3 className="font-headline text-lg font-bold">Quick start</h3>
        <p className="text-sm text-on-surface-variant">Tick what you have every month and enter your usual amount. You can rename or adjust anything later.</p>
      </div>

      {STARTER_ITEMS.map((g) => (
        <fieldset key={g.group} className="space-y-1.5">
          <legend className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{g.group}</legend>
          {g.items.map((s) => {
            const on = !!checked[s.key];
            return (
              <div key={s.key} className={cx('flex min-h-12 items-center gap-3 rounded-lg px-3', on ? 'bg-primary-fixed/50' : 'bg-surface-container')}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setChecked((c) => ({ ...c, [s.key]: !on }))}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', on ? 'bg-primary text-on-primary' : 'border-2 border-outline-variant')}>
                    {on && <Icon name="check" size={18} />}
                  </span>
                  <span className="truncate text-sm font-semibold">{s.name}</span>
                </button>
                {on && (
                  <label className="flex w-32 shrink-0 items-center rounded-lg bg-surface-container-lowest px-2.5 focus-within:ring-2 focus-within:ring-primary">
                    <span className="text-sm font-bold text-on-surface-variant">₱</span>
                    <input
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="Amount"
                      aria-label={`${s.name} amount`}
                      value={amounts[s.key] ?? ''}
                      onChange={(e) => setAmounts((a) => ({ ...a, [s.key]: e.target.value.replace(/[^\d.,]/g, '') }))}
                      className="min-h-10 w-full min-w-0 bg-transparent pl-1 text-sm font-semibold focus:outline-none"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </fieldset>
      ))}

      <FormError message={error} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button icon="check" disabled={busy || selected.length === 0} onClick={save} className="sm:flex-1">
          {selected.length ? `Add ${selected.length} item${selected.length === 1 ? '' : 's'}` : 'Tick items to add'}
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip, I'll add my own
        </Button>
      </div>
    </section>
  );
}
