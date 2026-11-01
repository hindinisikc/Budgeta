import { useEffect, useState } from 'react';
import { Badge, Icon, IconChip } from '../../components/ui';
import { formatPeso, pesos, type Centavos } from '../../domain/money';

interface MarginSimulatorProps {
  /** Current savings target for the month. */
  savingsTarget: Centavos;
  /** Margin as it stands now. */
  margin: Centavos;
}

const STEP = pesos(500);

/** What-if only: slide the savings target and see the resulting Margin. Nothing is saved. */
export function MarginSimulator({ savingsTarget, margin }: MarginSimulatorProps) {
  const [value, setValue] = useState(savingsTarget);
  useEffect(() => setValue(savingsTarget), [savingsTarget]);

  // Range: ₱0 up to "everything currently free", rounded to the step, with a sensible floor.
  const max = Math.max(Math.ceil((savingsTarget + Math.max(margin, 0)) / STEP) * STEP, pesos(20000));
  const simulated = margin + savingsTarget - value;

  return (
    <section className="space-y-4 rounded-xl bg-surface-container-low p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconChip icon="tune" look="soft" size="sm" />
          <h3 className="font-headline text-base font-bold">Margin Simulation</h3>
        </div>
        <Badge tone="primary">What-if</Badge>
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="sim-slider" className="text-sm text-on-surface-variant">
            Adjust savings target
          </label>
          <span className="font-headline text-xl font-bold text-primary">{formatPeso(value)}</span>
        </div>
        <input
          id="sim-slider"
          type="range"
          min={0}
          max={max}
          step={STEP}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-variant accent-primary"
        />
        <div className="flex justify-between text-xs text-on-surface-variant">
          <span>₱0</span>
          <span>Current: {formatPeso(savingsTarget)}</span>
          <span>{formatPeso(max)}</span>
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-lg bg-surface-container-lowest p-3 text-sm">
        <Icon name="spa" size={20} className="mt-0.5 shrink-0 text-tertiary" />
        <span>
          If you save <strong className="text-primary">{formatPeso(value)}</strong>, your guilt-free spending margin is{' '}
          <strong className={simulated < 0 ? 'text-error' : 'text-primary'}>{formatPeso(simulated)}</strong>
          {simulated < 0 ? ' — more than you have left this month.' : ' for leisure, dining and treats.'}
        </span>
      </p>
      <p className="text-xs text-on-surface-variant">To change your actual plan, edit each goal's monthly amount.</p>
    </section>
  );
}
