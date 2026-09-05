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
      {/* Labels inherit the list's 12.5px type size and add only muted color
          plus a 2px bottom margin; they intentionally avoid uppercase tracking. */}
      <dt className='m-0 mb-0.5 text-faint'>{label}</dt>
      <dd className='tnum wrap-anywhere m-0 text-fg'>{value}</dd>
    </div>
  );
}
