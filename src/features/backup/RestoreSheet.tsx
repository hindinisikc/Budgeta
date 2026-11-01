import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, FormError, Icon, Sheet } from '../../components/ui';
import { db } from '../../db/db';
import { restoreBackup } from '../../db/repo/backup';
import { backupCounts, type BackupCounts, type BackupFile } from '../../domain/backup';
import { useUi } from '../../state/ui';
import { useAction } from '../../state/useAction';
import { useBackupNow } from './useBackup';

interface RestoreSheetProps {
  open: boolean;
  onClose: () => void;
  backup: BackupFile | null;
}

const describe = (c: BackupCounts) =>
  `${c.months} month${c.months === 1 ? '' : 's'}, ${c.transactions} transaction${c.transactions === 1 ? '' : 's'}, ${c.goals} goal${c.goals === 1 ? '' : 's'}`;

/** Shows what's in the file vs what's on this device, then replaces everything on a second tap. */
export function RestoreSheet({ open, onClose, backup }: RestoreSheetProps) {
  const navigate = useNavigate();
  const { showToast } = useUi();
  const backupNow = useBackupNow();
  const [current, setCurrent] = useState<BackupCounts | null>(null);
  const [confirm, setConfirm] = useState(false);
  const { busy, error, run } = useAction();

  useEffect(() => {
    if (!open) return;
    setConfirm(false);
    void Promise.all([db.months.count(), db.transactions.count(), db.goals.count(), db.templates.count()]).then(([months, transactions, goals, recurring]) =>
      setCurrent({ months, transactions, goals, recurring }),
    );
  }, [open]);

  if (!backup) return <Sheet open={false} onClose={onClose} title="Restore">{null}</Sheet>;
  const incoming = backupCounts(backup.data);
  const when = backup.exportedAt ? new Date(backup.exportedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown date';

  return (
    <Sheet open={open} onClose={onClose} title="Restore Backup">
      <div className="space-y-4 pt-1">
        <div className="rounded-xl bg-surface-container-low px-4 py-3">
          <p className="text-xs text-on-surface-variant">Backup from {when}</p>
          <p className="font-semibold">{describe(incoming)}</p>
        </div>
        {current && (
          <p className="flex items-start gap-2 rounded-lg bg-error-container/60 px-3 py-2 text-sm text-on-error-container">
            <Icon name="info" size={18} className="mt-0.5 shrink-0" />
            This replaces everything currently in Budgeta on this device ({describe(current)}). It can't be undone.
          </p>
        )}
        <FormError message={error} />
        <div className="space-y-2">
          <Button variant="secondary" icon="savings" fullWidth disabled={busy} onClick={() => void run(backupNow)}>
            Save a backup of current data first
          </Button>
          <Button
            variant="danger"
            icon="restore_from_trash"
            fullWidth
            disabled={busy}
            className={confirm ? 'bg-error-container/70' : undefined}
            onClick={() => {
              if (!confirm) return setConfirm(true);
              void run(async () => {
                await restoreBackup(backup);
                onClose();
                showToast('Backup restored');
                navigate('/');
              });
            }}
          >
            {confirm ? 'Tap again to replace all data' : 'Replace with this backup'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
