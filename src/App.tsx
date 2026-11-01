import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { UiProvider } from './state/ui';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { BudgetPage } from './features/budget/BudgetPage';

// Less-used screens load on demand (still cached for offline use by the service worker).
const RecurringPage = lazy(() => import('./features/budget/recurring/RecurringPage').then((m) => ({ default: m.RecurringPage })));
const SavingsPage = lazy(() => import('./features/savings/SavingsPage').then((m) => ({ default: m.SavingsPage })));
const ActivityPage = lazy(() => import('./features/activity/ActivityPage').then((m) => ({ default: m.ActivityPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
// Component gallery is dev-only; Vite drops it from production builds.
const UiGallery = import.meta.env.DEV ? lazy(() => import('./features/dev/UiGallery')) : null;

const page = (node: ReactNode) => <Suspense fallback={null}>{node}</Suspense>;

export function App() {
  return (
    <UiProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="budget/recurring" element={page(<RecurringPage />)} />
            <Route path="savings" element={page(<SavingsPage />)} />
            <Route path="activity" element={page(<ActivityPage />)} />
            <Route path="settings" element={page(<SettingsPage />)} />
            <Route path="notifications" element={page(<NotificationsPage />)} />
            {UiGallery && <Route path="dev/ui" element={page(<UiGallery />)} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </UiProvider>
  );
}
