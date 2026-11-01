import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { currentMonthId, type MonthId } from '../domain/dates';

interface Toast {
  id: number;
  message: string;
}

interface UiState {
  selectedMonth: MonthId;
  setSelectedMonth: (id: MonthId) => void;
  quickAddOpen: boolean;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  toast: Toast | null;
  showToast: (message: string) => void;
}

const UiContext = createContext<UiState | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState<MonthId>(() => currentMonthId());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const value = useMemo<UiState>(
    () => ({
      selectedMonth,
      setSelectedMonth,
      quickAddOpen,
      openQuickAdd: () => setQuickAddOpen(true),
      closeQuickAdd: () => setQuickAddOpen(false),
      toast,
      showToast,
    }),
    [selectedMonth, quickAddOpen, toast, showToast],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiState {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
