import { cn } from '@/lib/utils';

import { Button } from './button';

/**
 * Pagination — README §7-4/§7-6/§9. 공용 컴포넌트로 Archive Search와 Batch
 * Operations 이력 목록이 함께 쓴다.
 *
 * - 이전 / 현재 페이지를 중심으로 한 5개 번호 창 / 다음. 현재 페이지는
 *   `aria-current="page"`, 끝에서는 진짜 `disabled`.
 * - mono "2 / 3" 인디케이터만 렌더링한다. D5/C2: "21–40 / 46" 범위 텍스트는
 *   디자인에서 pager 옆이 아니라 각 목록 패널의 헤딩 옆에 있다 — 그 표시는
 *   호출부(`archive-search-page.tsx`/`batch-history-list.tsx`)의 몫이다.
 * - D4: nav is left-aligned; the trailing "2 / 3" indicator alone is pushed
 *   to the right edge (`margin-left:auto` on just that span) — the whole
 *   row is not right-aligned as a cluster.
 * - E7 (parity cycle 2): the design is inconsistent between screens here —
 *   Archive's pager shows the "2 / 3" indicator, Ops's doesn't. Each screen
 *   follows its own design via `showPageIndicator` rather than unifying them.
 * - O5 (parity cycle 3, superseded — see O6 below): the design DOES declare a
 *   `[data-nav][data-active="true"]` soft-accent rule in its stylesheet, but
 *   every page-number button also carries an inline `style` attribute
 *   (background/color/border) — inline styles always win over a selector,
 *   however specific, so that rule never actually paints anything in the
 *   prototype capture. At the time this was treated as "match the render,
 *   not the dead rule," so the current page was left distinguished only via
 *   `aria-current="page"`.
 * - O6 (parity cycle 4): reverted — the inline-style bug in the prototype
 *   was a prototype defect, not design intent, and `aria-current` alone is
 *   invisible to sighted users (no visible current-page indicator at all).
 *   Product decision: implement the *stated* rule instead of the broken
 *   render — current page gets `background:var(--primary-soft)`,
 *   `color:var(--primary)`, `border-color:var(--primary-line)` (this app's
 *   token names for the design's `--accent-soft`/`--accent`/`--accent-line`).
 *   Do NOT re-remove this to "match the prototype capture" in a future
 *   parity pass — the capture itself is known-wrong here.
 * - 페이지 이동 시 "N페이지를 불러옵니다."를 **자체 live region 없이**
 *   호출부가 준 `onAnnounce`로만 알린다(§15: 화면당 단일 live region).
 * - 버튼은 최소 44×40px.
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
  /** "N페이지를 불러옵니다." 등 발표 문구를 호출부의 단일 live region으로 전달. */
  onAnnounce?: (message: string) => void;
  navLabel?: string;
  className?: string;
  /** E7: Archive's pager shows the trailing "2 / 3" indicator, Ops's doesn't. Defaults to shown. */
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
