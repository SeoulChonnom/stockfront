import { cn } from '@/lib/utils';

import { Button } from './button';

/**
 * Pagination — README §7-4/§7-6/§9. 공용 컴포넌트로 Archive Search와 Batch
 * Operations 이력 목록이 함께 쓴다.
 *
 * - 이전 / 현재 페이지를 중심으로 한 5개 번호 창 / 다음. 현재 페이지는
 *   `aria-current="page"`, 끝에서는 진짜 `disabled`.
 * - 범위 텍스트("21–40 / 46")와 mono "2 / 3" 인디케이터를 함께 렌더링한다.
 * - 페이지 이동 시 "N페이지를 불러옵니다."를 **자체 live region 없이**
 *   호출부가 준 `onAnnounce`로만 알린다(§15: 화면당 단일 live region).
 * - 버튼은 최소 40×44px.
 */

const WINDOW_SIZE = 5;

function getPageWindow(page: number, totalPages: number): number[] {
  if (totalPages <= WINDOW_SIZE) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(1, page - Math.floor(WINDOW_SIZE / 2));
  let end = start + WINDOW_SIZE - 1;

  if (end > totalPages) {
    end = totalPages;
    start = end - WINDOW_SIZE + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** range 텍스트("21–40 / 46") 계산용. 둘 다 있어야 렌더링된다. */
  totalCount?: number;
  pageSize?: number;
  /** "N페이지를 불러옵니다." 등 발표 문구를 호출부의 단일 live region으로 전달. */
  onAnnounce?: (message: string) => void;
  navLabel?: string;
  className?: string;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalCount,
  pageSize,
  onAnnounce,
  navLabel = '페이지 네비게이션',
  className,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const pageWindow = getPageWindow(page, safeTotalPages);

  function goTo(target: number) {
    if (target === page || target < 1 || target > safeTotalPages) {
      return;
    }

    onAnnounce?.(`${target}페이지를 불러옵니다.`);
    onPageChange(target);
  }

  const rangeText =
    totalCount !== undefined && pageSize !== undefined
      ? (() => {
          const start = (page - 1) * pageSize + 1;
          const end = Math.min(page * pageSize, totalCount);
          return `${start}–${end} / ${totalCount}`;
        })()
      : null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        className
      )}
    >
      {rangeText ? (
        <span className='mono text-[12.5px] text-[color:var(--text-soft)]'>
          {rangeText}
        </span>
      ) : (
        <span />
      )}
      <nav aria-label={navLabel} className='flex items-center gap-1'>
        <Button
          className='min-h-11 min-w-[40px] px-2'
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
          size='sm'
          type='button'
          variant='ghost'
        >
          이전
        </Button>
        {pageWindow.map((candidate) => (
          <Button
            aria-current={candidate === page ? 'page' : undefined}
            className='min-h-11 min-w-[40px] px-2'
            key={candidate}
            onClick={() => goTo(candidate)}
            size='sm'
            type='button'
            variant={candidate === page ? 'primary' : 'ghost'}
          >
            {candidate}
          </Button>
        ))}
        <Button
          className='min-h-11 min-w-[40px] px-2'
          disabled={page >= safeTotalPages}
          onClick={() => goTo(page + 1)}
          size='sm'
          type='button'
          variant='ghost'
        >
          다음
        </Button>
      </nav>
      <span className='mono text-[12.5px] font-semibold text-[color:var(--text-soft)]'>
        {page} / {safeTotalPages}
      </span>
    </div>
  );
}
