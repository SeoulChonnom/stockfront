import type { ReactNode } from 'react';

import { Empty } from '@/components/ui/empty';
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

/**
 * 레지스트리 `Empty`는 가운데 정렬 카드(`items-center justify-center
 * text-center text-balance`, 반응형 `p-6 md:p-12`)를 전제한다. 이 상태는
 * `permission-state.tsx`/`status-card.tsx`가 이미 정한 대로 셸 안 인페이지
 * 메시지라 왼쪽 정렬을 유지해야 하므로 그 기본값을 걷어낸다 — `md:p-12`처럼
 * 반응형 접두사가 붙은 유틸리티는 접두사 없는 값으로 지워지지 않아
 * `md:p-4`로 짝을 맞춰 지운다.
 *
 * `EmptyTitle`/`EmptyDescription`은 `asChild` 없이 `<div>`로 고정돼 있다.
 * 제목의 `h3`는 문서 개요에 들어가는 시맨틱이라(`cluster-analysis.test.tsx`가
 * `getAllByRole('heading', { level: 3 })`로 이 컴포넌트의 제목을 단언) 그대로
 * `h3`/`p`를 직접 쓰고 `EmptyTitle`/`EmptyDescription`/`EmptyHeader`는
 * 쓰지 않는다 — `EmptyHeader`도 가운데 정렬·`max-w-sm`을 전제해 같은 이유로
 * 제외한다. `EmptyMedia`는 이 컴포넌트에 아이콘이 없어 애초에 대상이 아니다.
 */
export function EmptyState({
  kind,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  const copy = DEFAULT_COPY[kind];

  return (
    <Empty
      className={cn(
        'block min-w-0 rounded-lg border border-dashed border-line-strong p-4 md:p-4 text-left text-wrap',
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
    </Empty>
  );
}
