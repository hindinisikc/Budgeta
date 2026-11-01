import { useCallback, useState } from 'react';
import { ValidationError } from '../db/repo/errors';

/**
 * Runs an async save/delete with busy + error state.
 * ValidationError messages are shown as-is; anything else gets a generic message (and is logged).
 */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
      else {
        console.error(e);
        setError('Something went wrong. Please try again.');
      }
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, setError, run };
}
