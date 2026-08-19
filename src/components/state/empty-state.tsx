import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type EmptyStateKind = 'search-results' | 'no-data' | 'no-articles';

const DEFAULT_COPY: Readonly<
  Record<EmptyStateKind, { title: string; description: string }>
> = {
  'search-results': {
    title: '검색 결과가 없습니다',
    description:
      '조건에 맞는 항목이 없습니다. 필터를 조정한 뒤 다시 시도해 주세요.',
  },
  'no-data': {
    title: '생성된 데이터가 없습니다',
    description: '아직 생성된 데이터가 없습니다.',
  },
  'no-articles': {
    title: '연결된 기사가 없습니다',
    description: '이 항목에 연결된 기사가 없습니다.',
  },
};

export type EmptyStateProps = {
  kind: EmptyStateKind;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function EmptyState({
  kind,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  const copy = DEFAULT_COPY[kind];

  return (
    <div
      className={cn(
        'min-w-0 rounded-[var(--r-lg)] border border-dashed border-[color:var(--line-strong)] p-4',
        className
      )}
    >
      <h3 className='m-0 mb-1 text-card-heading font-semibold text-fg'>
        {title ?? copy.title}
      </h3>
      <p className='measure-error wrap-anywhere m-0 text-body text-fg-soft'>
        {description ?? copy.description}
      </p>
      {actions ? (
        <div className='mt-3 flex flex-wrap gap-2'>{actions}</div>
      ) : null}
    </div>
  );
}
