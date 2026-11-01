import { useEffect, useState, type FormEvent } from 'react';
import { Button, Icon, Sheet, TextField, cx, toIconName, type IconName } from '../../components/ui';
import { addLabel, removeLabel, updateLabel, type LabelKind } from '../../db/repo/labels';
import { ValidationError } from '../../db/repo/errors';
import { NAME_MAX } from '../../domain/validate';
import type { Account, Category } from '../../domain/types';

interface LabelEditorSheetProps {
  kind: LabelKind;
  open: boolean;
  /** null = creating a new label. */
  label: Category | Account | null;
  icons: IconName[];
  onClose: () => void;
  onRemoved: (name: string, result: 'deleted' | 'archived') => void;
}

const NOUN: Record<LabelKind, string> = { category: 'Category', account: 'Account' };

/** Add / edit / remove a category or account (name + icon). */
export function LabelEditorSheet({ kind, open, label, icons, onClose, onRemoved }: LabelEditorSheetProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>(icons[0] ?? 'category');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setName(label?.name ?? '');
    setIcon(label ? toIconName(label.icon) : (icons[0] ?? 'category'));
    setError(null);
    setConfirmRemove(false);
  }, [open, label, icons]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : 'Something went wrong. Please try again.');
      if (!(e instanceof ValidationError)) console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const save = (e?: FormEvent) => {
    e?.preventDefault();
    void run(async () => {
      if (label) await updateLabel(kind, label.id, { name, icon });
      else await addLabel(kind, { name, icon });
      onClose();
    });
  };

  const remove = () => {
    if (!label) return;
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    void run(async () => {
      const result = await removeLabel(kind, label.id);
      onClose();
      onRemoved(label.name, result);
    });
  };

  // Show the chosen icon even if it isn't in this picker's list (e.g. from an older default).
  const options = icons.includes(icon) ? icons : [icon, ...icons];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={label ? `Edit ${NOUN[kind]}` : `New ${NOUN[kind]}`}
      headerAction={
        <Button variant="tonal" onClick={() => save()} disabled={busy}>
          Save
        </Button>
      }
    >
      <form onSubmit={save} className="space-y-5 pt-2">
        <TextField
          label="Name"
          value={name}
          maxLength={NAME_MAX}
          autoComplete="off"
          placeholder={kind === 'category' ? 'e.g. Pets' : 'e.g. UnionBank'}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />

        <fieldset className="space-y-1.5">
          <legend className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Icon</legend>
          <div className="grid grid-cols-6 gap-2">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                aria-label={opt.replace(/_/g, ' ')}
                aria-pressed={opt === icon}
                onClick={() => setIcon(opt)}
                className={cx(
                  'flex aspect-square min-h-11 items-center justify-center rounded-lg transition-colors',
                  opt === icon ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                <Icon name={opt} size={22} />
              </button>
            ))}
          </div>
        </fieldset>

        {label && (
          <Button
            variant="danger"
            icon="delete"
            fullWidth
            disabled={busy}
            onClick={remove}
            className={cx(confirmRemove && 'bg-error-container/60')}
          >
            {confirmRemove ? 'Tap again to remove' : `Remove ${NOUN[kind].toLowerCase()}`}
          </Button>
        )}
        {/* Lets Enter submit the form from the name field. */}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
