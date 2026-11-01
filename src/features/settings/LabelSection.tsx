import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Icon, IconChip, ListRow, SectionHeader, toIconName, type IconName } from '../../components/ui';
import { db } from '../../db/db';
import { restoreLabel, type LabelKind } from '../../db/repo/labels';
import type { Account, Category } from '../../domain/types';
import { LabelEditorSheet } from './LabelEditorSheet';

interface LabelSectionProps {
  kind: LabelKind;
  title: string;
  icons: IconName[];
}

/** Settings list for categories or accounts, with archived items tucked away below. */
export function LabelSection({ kind, title, icons }: LabelSectionProps) {
  const labels = useLiveQuery<Array<Category | Account>>(
    () => (kind === 'category' ? db.categories : db.accounts).orderBy('order').toArray(),
    [kind],
  );
  const [editing, setEditing] = useState<Category | Account | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = labels?.filter((l) => !l.archived) ?? [];
  const archived = labels?.filter((l) => l.archived) ?? [];

  const openEditor = (label: Category | Account | null) => {
    setNotice(null);
    setEditing(label);
    setSheetOpen(true);
  };

  return (
    <section className="min-w-0 space-y-2.5">
      <SectionHeader
        title={title}
        action={
          <button type="button" onClick={() => openEditor(null)} className="inline-flex min-h-11 items-center gap-1 px-1 text-primary hover:underline">
            <Icon name="add" size={16} /> Add
          </button>
        }
      />

      {notice && (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-tertiary-fixed/60 px-3 py-2 text-sm text-on-tertiary-fixed">
          <Icon name="info" size={18} className="mt-0.5" />
          <span className="flex-1">{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)} className="-m-1 p-1">
            <Icon name="close" size={16} />
          </button>
        </p>
      )}

      <div className="divide-y divide-surface-container overflow-hidden rounded-xl bg-surface-container-low shadow-soft">
        {labels === undefined ? (
          <div className="h-32 animate-pulse" />
        ) : active.length === 0 ? (
          <p className="p-4 text-sm text-on-surface-variant">None yet. Tap Add to create one.</p>
        ) : (
          active.map((l) => (
            <ListRow
              key={l.id}
              leading={<IconChip icon={toIconName(l.icon)} size="sm" shape="rounded" />}
              title={l.name}
              trailing={<Icon name="chevron_right" size={20} className="text-on-surface-variant" />}
              onClick={() => openEditor(l)}
            />
          ))
        )}
      </div>

      {archived.length > 0 && (
        <div className="px-0.5">
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            aria-expanded={showArchived}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-on-surface-variant"
          >
            Archived ({archived.length})
            <Icon name="keyboard_arrow_down" size={18} className={showArchived ? 'rotate-180' : ''} />
          </button>
          {showArchived && (
            <div className="divide-y divide-surface-container overflow-hidden rounded-xl bg-surface-container-low/60">
              {archived.map((l) => (
                <ListRow
                  key={l.id}
                  className="opacity-75"
                  leading={<IconChip icon={toIconName(l.icon)} size="sm" shape="rounded" tone="neutral" />}
                  title={l.name}
                  subtitle="Hidden from pickers; kept on past records"
                  trailing={
                    <button
                      type="button"
                      onClick={() => void restoreLabel(kind, l.id)}
                      className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary"
                    >
                      <Icon name="unarchive" size={18} /> Restore
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      <LabelEditorSheet
        kind={kind}
        open={sheetOpen}
        label={editing}
        icons={icons}
        onClose={() => setSheetOpen(false)}
        onRemoved={(name, result) =>
          setNotice(
            result === 'archived'
              ? `"${name}" is used by existing records, so it was archived instead of deleted. You can restore it below.`
              : `"${name}" was removed.`,
          )
        }
      />
    </section>
  );
}
