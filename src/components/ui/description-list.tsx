import type { ReactNode } from 'react';

export function DescriptionList({ children }: { children: ReactNode }) {
  return (
    <dl className='m-0 grid min-w-0 grid-cols-1 gap-x-[14px] gap-y-[10px] text-body-sm sm:grid-cols-2'>
      {children}
    </dl>
  );
}

export function DescriptionListItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className='min-w-0'>
      {/* design's `dt` for this dl carries no size/weight/case override —
          it inherits the dl's 12.5px and just gets the muted color +
          2px margin-bottom (reference: `<dt style="color:var(--fg3);
          margin-bottom:2px">`), unlike other dl instances in the app that
          do use the uppercase/tracked label treatment. */}
      <dt className='m-0 mb-0.5 text-faint'>{label}</dt>
      <dd className='mono wrap-anywhere m-0 text-fg'>{value}</dd>
    </div>
  );
}
