import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { SideNav } from './SideNav';
import { QuickAddSheet } from '../../features/quick-add/QuickAddSheet';
import { Toast } from './Toast';

export function AppShell() {
  const { pathname } = useLocation();

  // Each screen starts at the top, like switching tabs in a native app.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-dvh">
      <SideNav />
      <Header />
      <main className="pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10 lg:pl-64">
        <div className="mx-auto w-full max-w-2xl space-y-5 px-4 pt-2 lg:max-w-5xl lg:px-8 lg:pt-6">
          <Outlet />
        </div>
      </main>
      <BottomNav />
      <QuickAddSheet />
      <Toast />
    </div>
  );
}
