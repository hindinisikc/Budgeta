import type { ReactNode } from 'react';

interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  trailing?: ReactNode;
}

/** Screen title block: small uppercase eyebrow + serif headline. */
export function PageHeading({ eyebrow, title, trailing }: PageHeadingProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <span className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</span>}
        <h2 className="font-headline text-2xl font-bold leading-tight">{title}</h2>
      </div>
      {trailing}
    </div>
  );
}
