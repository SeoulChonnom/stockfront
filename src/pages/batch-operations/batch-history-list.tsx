import { type Ref, useEffect, useRef } from 'react';

import { EmptyState, InlineAlert, StatusBadge } from '@/components/state';
import { Skeleton } from '@/components/state/skeleton';
import { BatchTypeBadge } from '@/components/ui/batch-type-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScrollWrapper,
} from '@/components/ui/table';
import type { BatchRunRow } from '@/lib/query-hooks';
import { cn, computeTotalPages } from '@/lib/utils';

import type { BatchFilters } from './batch-url';
import {
  getBatchStatusSummaryLabel,
  getBatchTypeSummaryLabel,
} from './filter-copy';
import { getSnapshotLabel } from './format-batch';
import { useRetryAnnounce } from './use-retry-announce';

/**
 * README §7-6 point 5: master list panel. List loading/error are
 * independent of the detail panel (§7-6 "목록 loading/error는 상세와
 * 독립") — this component never reads detail query state, and its own
 * error rendering only replaces the table body area, not the header or
 * the page around it.
 *
 * E1 (superseded): this file's header comment used to say the
 * 시작일/종료일/상태/타입 filter FORM is deliberately absent from this
 * screen. That's no longer true — design v2's "조회 조건" card
 * (`batch-filters.tsx`, rendered by the owning page above the 배치 요약
 * section) now owns all four fields. This component keeps its own
 * read-only summary (applied status/type label + 필터 해제), which is a
 * DIFFERENT thing from the filter form: it reflects the currently
 * *applied* (URL) state, not a draft.
 */

export type BatchHistoryListProps = {
  applied: BatchFilters;
  rows: BatchRunRow[];
  totalCount: number;
  /** Page size the owning page queried with — kept out of this component so a `PAGE_SIZE` change there can't silently desync pagination/the range label here. */
  pageSize: number;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
  selectedJobId: number | null;
  onSelectRow: (jobId: number) => void;
  /** design v2 2055행: 필터 해제 clears BOTH status and type in one action ("상태와 타입 조건을 해제했습니다."), not status alone. */
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onAnnounce: (message: string) => void;
  /** Hidden below the master-detail breakpoint while `view=detail` is active (README §7-6 drill-in). */
  hiddenOnNarrowView: boolean;
};

export function BatchHistoryList({
  applied,
  rows,
  totalCount,
  pageSize,
  isLoading,
  isError,
  isFetching,
  onRetry,
  selectedJobId,
  onSelectRow,
  onClearFilters,
  onPageChange,
  onAnnounce,
  hiddenOnNarrowView,
}: BatchHistoryListProps) {
  const hasAppliedFilter = Boolean(applied.status || applied.type);
  const selectedRowButtonRef = useRef<HTMLButtonElement>(null);
  const wasHiddenRef = useRef(hiddenOnNarrowView);

  useEffect(() => {
    const wasHidden = wasHiddenRef.current;
    wasHiddenRef.current = hiddenOnNarrowView;

    if (wasHidden && !hiddenOnNarrowView) {
      selectedRowButtonRef.current?.focus({ preventScroll: true });
    }
  }, [hiddenOnNarrowView]);

  function clearFilters() {
    // 빈 상태의 필터 해제 버튼은 (헤더 버튼과 달리) 조건 없이 항상 렌더되므로
    // — 프로토타입의 무조건적인 `onFilterAll` 배선과 동일 — 실제로 해제할
    // 조건이 없을 때도 눌릴 수 있다. 그 경우까지 "해제했습니다"라고 announce
    // 하면 스크린리더 사용자에게 일어나지 않은 상태 변화를 사실로 알리게 되어
    // live region의 신뢰가 깨진다. announce만 조건부로 두고 네비게이션은 그대로
    // 흘려보낸다(같은 URL로의 이동이라 사실상 no-op).
    if (hasAppliedFilter) {
      onAnnounce('상태와 타입 조건을 해제했습니다.');
    }

    onClearFilters();
  }

  const retry = useRetryAnnounce(isFetching, isError, onAnnounce);
  const totalPages = computeTotalPages(totalCount, pageSize);

  return (
    // B6: this panel carries 0 padding — the header row, body, and
    // pagination each own theirs (matching 관련 기사/검색 결과).
    <Card
      className={cn(
        'min-w-0 overflow-hidden',
        hiddenOnNarrowView && 'max-[1180px]:hidden'
      )}
    >
      <CardContent className='flex min-w-0 flex-col gap-0 p-0'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--line)] px-4 py-3.5 sm:px-[18px]'>
          <div className='flex min-w-0 flex-wrap items-baseline gap-2'>
            {/* parity cycle A3: per-block card-heading size (see
                archive-search-filters.tsx's comment) — "실행 이력" measures
                14.5px in the design, not the README §6 17px scale. */}
            <h2 className='m-0 text-[14.5px] font-semibold text-[color:var(--text)]'>
              실행 이력
            </h2>
            <span className='mono text-[12.5px] font-semibold text-[color:var(--text-soft)]'>
              {totalCount === 0
                ? '0 / 0'
                : `${(applied.page - 1) * pageSize + 1}–${Math.min(applied.page * pageSize, totalCount)} / ${totalCount}`}
            </span>
            {/* E3: design always shows the applied status filter as plain
                muted mono text ("· 전체 상태" when none is set), not a
                conditional badge chip. design v2 2059행 `appliedFilterLabel`
                appends the applied type label after the status label
                ("... · 전체 타입" when none is set) — mirrored here via the
                shared `filter-copy.ts` summary label helpers so the wording
                stays identical to the 조회 조건 card's own applied summary. */}
            <span className='mono text-[11.5px] text-[color:var(--text-faint)]'>
              · {getBatchStatusSummaryLabel(applied.status)} ·{' '}
              {getBatchTypeSummaryLabel(applied.type)}
            </span>
          </div>
          {hasAppliedFilter ? (
            <Button
              onClick={clearFilters}
              size='sm'
              type='button'
              variant='ghost'
            >
              필터 해제
            </Button>
          ) : null}
        </div>

        {isError ? (
          <div className='p-4 sm:p-[18px]'>
            <InlineAlert
              actions={
                <Button
                  onClick={() => retry(onRetry)}
                  size='sm'
                  type='button'
                  variant='ghost'
                >
                  목록 다시 시도
                </Button>
              }
              tone='danger'
            >
              배치 목록을 불러오지 못했습니다. 필터와 이전 선택은 그대로
              유지됩니다.
            </InlineAlert>
          </div>
        ) : (
          <TableScrollWrapper>
            {/* design's table carries `min-width:520px` (reference:
                `<table style="...min-width:520px...">`), not 480. */}
            <Table aria-busy={isLoading} minWidth={520}>
              <TableHeader>
                <TableRow>
                  {/* 참조 846-850행: 이 표의 th는 모두 `padding:9px ...` —
                      `table.tsx`의 다른 페이지(예: 지수 표)가 쓰는 8px과는
                      다른 페이지별 값이라 여기 콜사이트에서 덮어쓴다. */}
                  <TableHead className='h-auto py-[9px] pl-4 sm:pl-[18px]'>
                    작업 · 기준일
                  </TableHead>
                  {/* 새 5번째 컬럼(타입) — 참조의 `--tc2`는 `--tc3`(원문/정제/이슈)와
                      다른 브레이크포인트를 쓴다: `--tc2`/`--tc2i`는
                      `@media(max-width:640px)`에서만 전환되고(참조 62행),
                      `--tc3`/`--tc3i`는 `@media(max-width:1180px)`에서
                      전환된다(참조 60행). 즉 타입 컬럼은 모바일(≤640px)에서만
                      첫 셀 안의 배지(`--tc2i`)로 접히고, 태블릿/랩톱 폭에서는
                      실제 컬럼으로 남아 있어야 한다. */}
                  <TableHead className='hidden h-auto py-[9px] px-3 min-[641px]:table-cell'>
                    타입
                  </TableHead>
                  <TableHead className='h-auto py-[9px] px-3'>상태</TableHead>
                  <TableHead className='h-auto py-[9px] px-3 text-right'>
                    소요
                  </TableHead>
                  {/* E4: design text is "원문/정제/이슈" (slashes), and the
                      column must not wrap the header or the values. */}
                  <TableHead className='hidden h-auto py-[9px] pr-4 text-right whitespace-nowrap min-[1181px]:table-cell sm:pr-[18px]'>
                    원문/정제/이슈
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows />
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell className='p-4 sm:p-[18px]' colSpan={5}>
                      {/* design v2 836행: exact empty-state copy + a 필터
                          해제 action, always offered here (unlike the header
                          button above, which is conditional on
                          `hasAppliedFilter`) — clicking it is a no-op UX-wise
                          when no status/type filter is applied, matching the
                          prototype's unconditional `onFilterAll` wiring. */}
                      <EmptyState
                        actions={
                          <Button
                            onClick={clearFilters}
                            size='sm'
                            type='button'
                            variant='secondary'
                          >
                            필터 해제
                          </Button>
                        }
                        description='선택한 기간·상태·타입 조건에 해당하는 작업이 없습니다. 상태와 타입 조건을 해제하면 같은 기간의 전체 이력을 볼 수 있습니다.'
                        kind='search-results'
                        title='표시할 실행 이력이 없습니다'
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <BatchHistoryRow
                      buttonRef={
                        row.id === selectedJobId
                          ? selectedRowButtonRef
                          : undefined
                      }
                      isSelected={row.id === selectedJobId}
                      key={row.id}
                      onSelect={() => {
                        onAnnounce(`job ${row.id} 상세를 표시합니다.`);
                        onSelectRow(row.id);
                      }}
                      row={row}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableScrollWrapper>
        )}

        {!isError && !isLoading && rows.length > 0 ? (
          <Pagination
            className='px-4 py-3 sm:px-[18px]'
            onAnnounce={onAnnounce}
            onPageChange={onPageChange}
            page={applied.page}
            showPageIndicator={false}
            totalPages={totalPages}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton *rows* for this specific 4-column layout — deliberately not the
 * shared `SkeletonTableRows` component, which renders its own `<table>`
 * wrapper (correct when it replaces a whole table, but invalid nested here
 * inside this component's own `<tbody>`). Using the `Skeleton` atom
 * directly keeps the real header row visible while loading (README §8:
 * "skeleton은 실제 레이아웃 골격을 유지한다").
 */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 5-row aria-hidden placeholder, never reordered
        <TableRow aria-hidden='true' key={`skeleton-${index}`}>
          <TableCell>
            <Skeleton className='h-4 w-28' />
          </TableCell>
          <TableCell className='hidden min-[641px]:table-cell'>
            <Skeleton className='h-4 w-16' />
          </TableCell>
          <TableCell>
            <Skeleton className='h-4 w-20' />
          </TableCell>
          <TableCell>
            <Skeleton className='h-4 w-16' />
          </TableCell>
          <TableCell className='hidden min-[1181px]:table-cell'>
            <Skeleton className='h-4 w-24' />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function BatchHistoryRow({
  buttonRef,
  row,
  isSelected,
  onSelect,
}: {
  buttonRef?: Ref<HTMLButtonElement>;
  row: BatchRunRow;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isFailed = row.rawStatus.trim().toUpperCase() === 'FAILED';

  return (
    // 행 전체가 선택 히트 영역이다 — 기준일 버튼만 클릭 대상이던 시절에는
    // 행의 나머지(상태/소요/카운트 셀)를 눌러도 아무 반응이 없었다. 버튼은
    // 키보드/스크린리더용 접근 가능한 컨트롤로 그대로 남기고, 그 클릭은
    // 아래 `stopPropagation`으로 이 핸들러와 중복 실행되지 않게 한다.
    <TableRow
      aria-selected={isSelected}
      className='cursor-pointer'
      onClick={onSelect}
      selected={isSelected}
      tone={isFailed ? 'danger' : undefined}
    >
      {/* E5: row pitch — design's body cell vertical padding is 10px, not
          the shared `TableCell` default (18px).
          모든 셀이 `vertical-align:top`이다(참조 856/862/865/869/870행) —
          `TableCell`의 기본값(`align-middle`)을 이 표의 다섯 셀 전부에서
          덮어쓴다. 이 첫 셀은 행에서 가장 키가 크므로 top/middle 차이가
          시각적으로 드러나지 않지만, 짧은 셀(타입/상태/소요)은 middle일
          때 세로 중앙으로 떠 배지가 셀 안에서 10px가 아니라 훨씬 아래에서
          시작한다. */}
      <TableCell className='py-2.5 pl-4 align-top sm:pl-[18px]'>
        <button
          aria-label={`job ${row.id} 상세 선택`}
          // X1 (parity cycle 8): design's row button is 13.5px
          // (`font-size:13.5px` inline on `<button onClick="{{ r.onSelect }}">`
          // in the prototype), not 14px — this 0.5px difference alone
          // (13.5*1.6=21.6 vs 14*1.6=22.4 line-height) drove ~0.8px of extra
          // height on every "normal" history row (15 of 20 measured rows).
          className='mono block min-w-0 rounded-[var(--r-sm)] text-left text-[13.5px] font-semibold text-[color:var(--text)] outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]'
          ref={buttonRef}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          type='button'
        >
          {row.businessDate}
        </button>
        {/* M3 (parity cycle 4): design's jobId/counts sublines here carry
            no margin-top at all (`display:block`, stacked purely by
            line-height) at 11px — the app's `mt-0.5`/`mt-1` plus 12px were
            adding ~6-7px of extra row height, only visible once the third
            (원문/정제/이슈) line renders at ≤1180px alongside it.
            W1 (parity cycle 7): when there is no snapshot, `pageId` is
            `null` — printing `pageId -` reads as though a page id exists
            and is literally "-". The design (`r.pageLabel`, line ~1999 of
            the prototype) and the detail panel's `스냅샷` field
            (`batch-detail-panel.tsx`) both collapse the whole
            "pageId N · vN" clause to `스냅샷 없음` in that case — do the
            same here instead of leaking the missing-value placeholder.
            Confirmed directly against the reference (`#/ops/batches`):
            the design's own equivalent `<span>` for a normal row ALSO
            wraps to two lines at this column's width (measured 35.19px,
            same as the app) — only the no-snapshot row is short enough to
            stay on one line (measured ~60px row height on both sides
            after this fix). Do not add `whitespace-nowrap` here: that was
            tried and it force-shrinks every normal row 15px below the
            design's own wrapped height — an overcorrection past the
            reference, not a fix. */}
        <div className='mono text-[11px] text-[color:var(--text-faint)]'>
          job {row.id} · {getSnapshotLabel(row)}
        </div>
        {/* 모바일(≤640px)에서는 타입 컬럼 자체가 접히므로(`--tc2`, 참조
            62행), 참조의 `--tc2i` 배지를 이 첫 셀 안에 대신 렌더한다 —
            원문/정제/이슈 subline(`--tc3i`, 1180px)과는 다른, 더 좁은
            브레이크포인트다. */}
        <BatchTypeBadge
          className='mt-1 px-[7px] py-0.5 text-[11px] min-[641px]:hidden'
          jobType={row.jobType}
        />
        {/* 참조 860행의 `--tc3i` span은 `font-family:var(--mono)`다 — 이
            `mono`가 빠져 있어서 mobile(390px)에서 후보만 한 줄에 들어가고
            (자연 폭 122.9px < 가용 152.4px) 레퍼런스는 두 줄로 넘어갔다
            (156.4px > 138.3px). 그 17.6px가 mobile 행 높이 차(123 vs
            140.6)의 전부였다. 위 jobId subline은 이미 `mono`를 쓰고 있어
            이 줄만 누락된 상태였다. */}
        <div className='mono min-[1181px]:hidden text-[11px] text-[color:var(--text-faint)]'>
          원문/정제/이슈 {row.counts}
        </div>
      </TableCell>
      <TableCell className='hidden py-2.5 px-3 align-top min-[641px]:table-cell'>
        {/* 참조의 td 배지(863행)는 `padding:2px 8px`로, 상세 헤더 배지의
            기본 3px 8px(894행)보다 세로 padding이 1px 작다 — 이 컬럼
            인스턴스에서만 `py-0.5`(2px)로 덮어쓴다. */}
        <BatchTypeBadge className='py-0.5' jobType={row.jobType} />
      </TableCell>
      <TableCell className='py-2.5 px-3 align-top'>
        {/* X1 (parity cycle 8): the design's per-row ops badge is the same
            11.5px/3px-8px pill already used for the archive-results table
            (N2, parity cycle 3) — `size='sm'`, not the page-level default
            (12px/py-1/px-[9px]). The default badge's extra ~2.8px, plus the
            partial-detail subline below also running 0.5px oversize, made
            every PARTIAL row (the tallest cell in that row) ~4.4px taller
            than the design. */}
        <StatusBadge size='sm' status={row.rawStatus} />
        {row.rawStatus.trim().toUpperCase() === 'PARTIAL' && row.detail ? (
          <div className='wrap-anywhere mt-1 text-[11.5px] text-[color:var(--text-faint)]'>
            {row.detail}
          </div>
        ) : null}
      </TableCell>
      <TableCell className='py-2.5 px-3 text-right align-top'>
        <div className='mono text-[13px] text-[color:var(--text)]'>
          {row.duration}
        </div>
        {/* D10: design's subline is the bare KST datetime, no "시작 " prefix.
            O2 (parity cycle 3): same whitespace-nowrap treatment as the
            원문/정제/이슈 column — the design fits the full KST timestamp on
            one line, the app was wrapping it across two.
            X1 (parity cycle 8): the design's subline span is 11px with no
            margin-top (`display:block;font-size:11px`, stacked purely by
            line-height) — the app's 12px + `mt-0.5` (2px) made this cell the
            tallest one in the "스냅샷 없음" rows, adding ~2.8px there. */}
        <div className='mono text-[11px] whitespace-nowrap text-[color:var(--text-faint)]'>
          {row.startedAt}
        </div>
      </TableCell>
      <TableCell className='mono hidden py-2.5 pr-4 text-right align-top whitespace-nowrap min-[1181px]:table-cell sm:pr-[18px]'>
        {row.counts}
      </TableCell>
    </TableRow>
  );
}
