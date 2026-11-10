import type { ReactNode } from 'react';

interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  trailing?: ReactNode;
}

/** Screen title. */
export function PageHeading({ eyebrow, title, trailing }: PageHeadingProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <span className="text-sm font-medium text-primary">{eyebrow}</span>}
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      {trailing}
    </div>
  );
}
