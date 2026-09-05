import { Button } from '@/components/ui/button';
import {
  PaginationContent,
  PaginationItem,
  Pagination as PaginationRoot,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

/**
 * Shared pager; page changes announce through the app's single live region.
 *
 * Only Pagination/PaginationContent/PaginationItem (the nav > ul > li shell)
 * are adopted from the shadcn registry. PaginationLink/PaginationPrevious/
 * PaginationNext/PaginationEllipsis are intentionally not used: PaginationLink
 * hard-codes an <a> with no `asChild`, so it renders role="link" (this pager
 * moves via an onPageChange callback, not href navigation), cannot express
 * `disabled` on the first/last page (an <a> has no disabled state, and
 * pagination.test.tsx asserts toBeDisabled() on 이전/다음), and its
 * Previous/Next variants hard-code English "Previous"/"Next" copy that would
 * displace the Korean 이전/다음 labels this app requires. The existing Button
 * is kept for the actual controls instead.
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
  // Clamps a caller-supplied out-of-range `page` (e.g. the URL's page
  // outliving the result set after a narrower filter is applied) so the
  // pager never renders or acts on a page beyond what actually exists.
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const pageWindow = getPageWindow(safePage, safeTotalPages);

  function goTo(target: number) {
    if (target === safePage || target < 1 || target > safeTotalPages) {
      return;
    }

    onAnnounce?.(`${target}페이지를 불러옵니다.`);
    onPageChange(target);
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Registry defaults `mx-auto w-full justify-center` are cancelled:
          this pager is a left-aligned inline control, not a centred block. */}
      <PaginationRoot
        aria-label={navLabel}
        className='mx-0 w-auto justify-start'
      >
        {/* Registry default is `gap-1`; this pager keeps its `gap-2` rhythm,
            plus `flex-wrap` so the item list can wrap onto a second line. */}
        <PaginationContent className='flex-wrap gap-2'>
          <PaginationItem>
            <Button
              className='min-h-10 min-w-11 border-line-strong bg-card px-3 text-body-sm font-normal text-fg'
              disabled={safePage <= 1}
              onClick={() => goTo(safePage - 1)}
              size='sm'
              type='button'
              variant='ghost'
            >
              이전
            </Button>
          </PaginationItem>
          {pageWindow.map((candidate) => (
            <PaginationItem key={candidate}>
              <Button
                aria-current={candidate === safePage ? 'page' : undefined}
                className={cn(
                  'tnum min-h-10 min-w-11 bg-card px-2.5 text-body-sm text-fg-soft',
                  candidate === safePage &&
                    'border-primary-line bg-primary-soft text-primary'
                )}
                onClick={() => goTo(candidate)}
                size='sm'
                type='button'
                variant='ghost'
              >
                {candidate}
              </Button>
            </PaginationItem>
          ))}
          <PaginationItem>
            <Button
              className='min-h-10 min-w-11 border-line-strong bg-card px-3 text-body-sm font-normal text-fg'
              disabled={safePage >= safeTotalPages}
              onClick={() => goTo(safePage + 1)}
              size='sm'
              type='button'
              variant='ghost'
            >
              다음
            </Button>
          </PaginationItem>
        </PaginationContent>
      </PaginationRoot>
      {showPageIndicator ? (
        <span className='tnum ml-auto text-label text-faint'>
          {safePage} / {safeTotalPages}
        </span>
      ) : null}
    </div>
  );
}
