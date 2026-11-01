import { useEffect, useRef, useState } from 'react';
import { Button, FormError, Icon, SectionHeader, cx } from '../../components/ui';
import { checkBackup, type BackupFile } from '../../domain/backup';
import { useAction } from '../../state/useAction';
import { RestoreSheet } from './RestoreSheet';
import { useBackupNow, useBackupStatus, useExportCsv } from './useBackup';

/** Settings → Your data: backup, restore, CSV export, and whether the browser protects storage. */
export function DataSection() {
  const status = useBackupStatus();
  const backupNow = useBackupNow();
  const exportCsv = useExportCsv();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const { busy, error, setError, run } = useAction();

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const result = checkBackup(await file.text());
    if (!result.ok) return setError(result.errors.join(' '));
    setPending(result.backup!);
    setRestoreOpen(true);
  };

  const last =
    status?.daysSince == null
      ? 'Never backed up'
      : status.daysSince === 0
        ? 'Last backup: today'
        : `Last backup: ${status.daysSince} day${status.daysSince === 1 ? '' : 's'} ago`;

  return (
    <section className="min-w-0 space-y-2.5">
      <SectionHeader title="Your data" />
      <div className="space-y-3 rounded-xl bg-surface-container-low p-4 shadow-soft">
        <p className={cx('flex items-center gap-2 text-sm font-semibold', status?.due ? 'text-error' : 'text-on-surface-variant')}>
          <Icon name={status?.due ? 'info' : 'check_circle'} size={18} />
          {last}
        </p>
        <p className="text-xs text-on-surface-variant">
          Your data lives only on this device. Save a backup regularly (to Google Drive or Files) so you can restore it if the phone is lost or the browser is cleared.
        </p>
        <Button icon="savings" fullWidth disabled={busy} onClick={() => void run(backupNow)}>
          Back up now
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
            Restore
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void run(exportCsv)}>
            Export CSV
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <FormError message={error} />
        {persisted === false && (
          <p className="text-xs text-on-surface-variant">
            Tip: install Budgeta to your home screen so the browser is less likely to clear its storage.
          </p>
        )}
      </div>
      <RestoreSheet open={restoreOpen} onClose={() => setRestoreOpen(false)} backup={pending} />
    </section>
  );
}
