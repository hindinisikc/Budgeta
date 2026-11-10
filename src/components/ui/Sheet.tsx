import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional element on the right of the header (e.g. a Save button). */
  headerAction?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Bottom sheet on phones, centered dialog on desktop (≥1024px).
 * Built on native <dialog>: focus trapping, Esc to close and inert background come for free.
 */
export function Sheet({ open, onClose, title, headerAction, footer, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // Layout effect: open/close the native dialog in the same frame React commits, so it never lags behind state.
  // The page's own scrolling is deliberately left alone: locking it (overflow: hidden on <html>) makes
  // iOS shift fixed layers by the scroll offset, pushing the sheet off-screen in the installed app.
  // Closing plays a short slide-down first (see dialog[data-closing] in theme.css), then really closes.
  const closeTimer = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      window.clearTimeout(closeTimer.current);
      delete dialog.dataset.closing;
      if (!dialog.open) {
        dialog.showModal();
        dialog.focus(); // focus the sheet, not its first button, so no highlight ring appears on open
      }
    } else if (dialog.open && !dialog.dataset.closing) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        dialog.close();
        return;
      }
      dialog.dataset.closing = 'true';
      closeTimer.current = window.setTimeout(() => {
        delete dialog.dataset.closing;
        dialog.close();
      }, 200);
    }
  }, [open]);
  useLayoutEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Freeze the page behind the sheet. Pinning <body> (instead of overflow: hidden on <html>) keeps
  // iOS from shifting the sheet; the scroll position is restored when the sheet closes.
  useLayoutEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const body = document.body.style;
    const previous = { position: body.position, top: body.top, left: body.left, right: body.right };
    Object.assign(body, { position: 'fixed', top: `-${y}px`, left: '0', right: '0' });
    return () => {
      Object.assign(body, previous);
      window.scrollTo(0, y);
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click landing on the <dialog> itself (not its content) means the backdrop was tapped.
        if (e.target === e.currentTarget) onClose();
      }}
      // Phones: pinned to the screen's bottom edge explicitly (no auto margins). Desktop: centred.
      className="fixed inset-x-0 top-auto bottom-0 m-0 touch-none outline-none h-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-xl bg-surface p-0 text-on-surface shadow-bar-top backdrop:bg-on-surface/30 backdrop:animate-fade-in open:flex open:animate-sheet-up open:flex-col lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[85dvh] lg:w-[min(32rem,calc(100%-2rem))] lg:rounded-xl"
    >
      <div className="flex justify-center pt-2.5 lg:hidden">
        <span className="h-1.5 w-10 rounded-full bg-surface-container-highest" />
      </div>
      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-2 lg:pt-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full px-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
        >
          <Icon name="close" size={20} />
          {/* Icon-only on the narrowest phones so the title fits on one line; still announced as "Cancel". */}
          <span className="max-[379px]:sr-only">Cancel</span>
        </button>
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex min-w-[76px] justify-end">{headerAction}</div>
      </header>
      {/* Only this area responds to drags; overscroll-contain stops it pulling the page behind. */}
      <div className={footer ? 'min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-4' : 'min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),1rem)]'}>
        {children}
      </div>
      {footer && <div className="border-t border-outline-variant/40 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">{footer}</div>}
    </dialog>
  );
}
