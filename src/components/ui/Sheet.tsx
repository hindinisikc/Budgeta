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
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click landing on the <dialog> itself (not its content) means the backdrop was tapped.
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-xl bg-surface p-0 text-on-surface shadow-bar-top backdrop:bg-on-surface/30 backdrop:animate-fade-in open:flex open:animate-sheet-up open:flex-col lg:m-auto lg:max-h-[85dvh] lg:w-[min(32rem,calc(100%-2rem))] lg:rounded-xl"
    >
      <div className="flex justify-center pt-2.5 lg:hidden">
        <span className="h-1.5 w-12 rounded-full bg-surface-variant" />
      </div>
      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-2 lg:pt-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
        >
          <Icon name="close" size={20} />
          Cancel
        </button>
        <h2 className="flex items-center gap-2 font-headline text-lg font-bold">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {title}
        </h2>
        <div className="flex min-w-[76px] justify-end">{headerAction}</div>
      </header>
      <div className={footer ? 'flex-1 overflow-y-auto px-4 pb-4' : 'flex-1 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)]'}>
        {children}
      </div>
      {footer && <div className="border-t border-outline-variant/40 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">{footer}</div>}
    </dialog>
  );
}
