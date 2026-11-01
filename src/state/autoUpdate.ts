/**
 * Keeps the installed app on the latest deploy without the user having to restart it twice.
 *
 * - Checks for a new version whenever the app is opened or brought back to the foreground.
 * - When a new version takes over, reloads into it — but never while a sheet is open or the user
 *   is typing; it waits until they're done so nothing in progress is lost.
 */
export function setupAutoUpdate(): void {
  if (!('serviceWorker' in navigator)) return;

  // On the very first visit there is no previous version, so there's nothing to reload into.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;

  const busy = () => {
    if (document.querySelector('dialog[open]')) return true;
    const el = document.activeElement;
    return !!el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
  };

  const reloadWhenIdle = () => {
    if (reloading) return;
    if (busy()) {
      setTimeout(reloadWhenIdle, 1500);
      return;
    }
    reloading = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) reloadWhenIdle();
  });

  // iOS keeps installed apps paused in the background, so also check when the app comes back.
  const check = () => void navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => undefined);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
}
