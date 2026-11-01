import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { UiProvider } from './state/ui';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { BudgetPage } from './features/budget/BudgetPage';
import { RecurringPage } from './features/budget/recurring/RecurringPage';
import { SavingsPage } from './features/savings/SavingsPage';
import { ActivityPage } from './features/activity/ActivityPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';

// Component gallery is dev-only; Vite drops it from production builds.
const UiGallery = import.meta.env.DEV ? lazy(() => import('./features/dev/UiGallery')) : null;

export function App() {
  return (
    <UiProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="budget/recurring" element={<RecurringPage />} />
            <Route path="savings" element={<SavingsPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            {UiGallery && (
              <Route
                path="dev/ui"
                element={
                  <Suspense fallback={null}>
                    <UiGallery />
                  </Suspense>
                }
              />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </UiProvider>
  );
}
