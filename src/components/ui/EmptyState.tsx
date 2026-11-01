import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon = 'potted_plant', title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-surface-container-low px-6 py-10 text-center shadow-soft">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed/60 text-primary">
        <Icon name={icon} size={28} />
      </span>
      <h3 className="font-headline text-lg font-bold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-on-surface-variant">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
