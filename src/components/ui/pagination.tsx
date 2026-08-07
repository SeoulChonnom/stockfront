import { cn } from '@/lib/utils';

import { Button } from './button';

/** Shared pager; page changes announce through the app's single live region. */

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
  onAnnounce?: (message: string) => void;
  navLabel?: string;
  className?: string;
  showPageIndicator?: boolean;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
  onAnnounce,
  navLabel = '페이지 네비게이션',
  className,
  showPageIndicator = true,
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

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <nav aria-label={navLabel} className='flex flex-wrap items-center gap-2'>
        <Button
          className='min-h-10 min-w-11 border-[color:var(--line-strong)] bg-[color:var(--surface)] px-3 text-[13px] font-normal text-[color:var(--text)]'
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
            className={cn(
              'mono min-h-10 min-w-11 bg-[color:var(--surface)] px-2.5 text-[13px] text-[color:var(--text-soft)]',
              candidate === page &&
                'border-[color:var(--primary-line)] bg-[color:var(--primary-soft)] text-[color:var(--primary)]'
            )}
            key={candidate}
            onClick={() => goTo(candidate)}
            size='sm'
            type='button'
            variant='ghost'
          >
            {candidate}
          </Button>
        ))}
        <Button
          className='min-h-10 min-w-11 border-[color:var(--line-strong)] bg-[color:var(--surface)] px-3 text-[13px] font-normal text-[color:var(--text)]'
          disabled={page >= safeTotalPages}
          onClick={() => goTo(page + 1)}
          size='sm'
          type='button'
          variant='ghost'
        >
          다음
        </Button>
      </nav>
      {showPageIndicator ? (
        <span className='mono ml-auto text-[12px] text-[color:var(--text-faint)]'>
          {page} / {safeTotalPages}
        </span>
      ) : null}
    </div>
  );
}
