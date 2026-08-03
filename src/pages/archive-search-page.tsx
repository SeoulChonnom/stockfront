import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

import { useAnnounce } from '@/components/shell/use-announce';
import {
  EmptyState,
  InlineAlert,
  RefetchBadge,
  SkeletonTableRows,
} from '@/components/state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { parseListFilters } from '../lib/app-state';
import { formatInteger } from '../lib/formatters';
import { useArchiveList } from '../lib/query-hooks';
import { buildUrl, navigate } from '../lib/router';
import type { ArchiveListView } from '../lib/view-models';
import { ArchiveResultsTable } from './archive-search/archive-results-table';
import { ArchiveSearchFilters } from './archive-search/archive-search-filters';
import {
  ARCHIVE_SEARCH_STATUSES,
  type ArchiveFilterDraft,
} from './archive-search/filter-copy';
import { useLastGoodData } from './archive-search/use-last-good-data';

const PAGE_SIZE = 20;

function buildArchiveSearchUrl(filters: ArchiveFilterDraft & { page: number }) {
  return buildUrl('/market/archive/search', filters);
}

function buildFiltersKey(filters: ArchiveFilterDraft & { page: number }) {
  return `${filters.from}:${filters.to}:${filters.status}:${filters.page}`;
}

export function ArchiveSearchPage({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const applied = parseListFilters(searchParams, {
    allowedStatuses: ARCHIVE_SEARCH_STATUSES,
  });
  const announce = useAnnounce();
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const pendingApplyAnnounceKeyRef = useRef<string | null>(null);
  const appliedKey = buildFiltersKey(applied);

  const archiveQuery = useArchiveList({
    fromDate: applied.from,
    toDate: applied.to,
    status: applied.status || undefined,
    page: applied.page,
    size: PAGE_SIZE,
  });

  // `useArchiveList` has no `placeholderData: keepPreviousData` option (its
  // signature is fixed in `src/lib/query-hooks.ts`, out of this phase's file
  // ownership) — every filter/page change is a distinct query key, so
  // TanStack Query itself would drop `data` back to `undefined` while the
  // new key loads or errors. §8 requires the opposite ("loading은 필터 카드를
  // 유지... refetching(이전 결과 유지)... error(필터 위에 alert + 필터와 이전
  // 결과 유지"), so the last successful page is retained locally here and
  // used as the display fallback whenever the live query has no data of its
  // own yet.
  const displayData = useLastGoodData(archiveQuery.data);
  const hasData = displayData !== null;
  const isInitialLoading = archiveQuery.isLoading && !hasData;

  useEffect(() => {
    if (pendingApplyAnnounceKeyRef.current !== appliedKey) {
      return;
    }

    if (archiveQuery.isLoading) {
      return;
    }

    pendingApplyAnnounceKeyRef.current = null;

    if (!archiveQuery.error) {
      announce(
        `검색 결과 ${archiveQuery.data?.totalCount ?? 0}건을 찾았습니다.`
      );
    }
  }, [
    appliedKey,
    archiveQuery.isLoading,
    archiveQuery.data,
    archiveQuery.error,
    announce,
  ]);

  function focusAndScrollToResults() {
    const heading = resultsHeadingRef.current;
    heading?.focus({ preventScroll: true });
    // Guarded rather than called unconditionally: jsdom (this repo's test
    // environment) has no `scrollIntoView` implementation at all, unlike a
    // real browser.
    if (typeof heading?.scrollIntoView === 'function') {
      heading.scrollIntoView({ block: 'start' });
    }
  }

  function handleApply(next: ArchiveFilterDraft) {
    const target = { ...next, page: 1 };
    pendingApplyAnnounceKeyRef.current = buildFiltersKey(target);
    focusAndScrollToResults();
    navigate(buildArchiveSearchUrl(target));
  }

  function handleReset() {
    focusAndScrollToResults();
    // Bare URL (no from/to/status/page) lets `parseListFilters` recompute
    // its own defaults — the single source of truth for "default range",
    // rather than duplicating that computation here.
    navigate('/market/archive/search');
  }

  function handlePageChange(page: number) {
    focusAndScrollToResults();
    navigate(
      buildArchiveSearchUrl({
        from: applied.from,
        to: applied.to,
        status: applied.status,
        page,
      })
    );
  }

  return (
    <div className='flex min-w-0 flex-col gap-[var(--gap)]'>
      <section className='flex flex-col gap-1.5'>
        <h1
          className='m-0 text-[22px] font-semibold text-[color:var(--text)] focus:outline-none'
          id='page-title'
          tabIndex={-1}
        >
          아카이브 검색
        </h1>
        {/* D5: design's measure here is 70ch, not the shared 76ch
            `.measure-summary` utility. U2: the design's title `<section>`
            is `display:flex;gap:6px` between h1 and this paragraph, not a
            margin on the paragraph — `gap-1.5` (6px) on the wrapper above
            replaces what used to be an `mt-2` (8px) margin here. */}
        <p className='wrap-anywhere max-w-[70ch] text-[13.5px] text-[color:var(--text-soft)]'>
          기준일 범위와 생성 상태로 과거 스냅샷을 찾습니다. 결과를 열면 해당
          날짜의 시장 브리프로 이동하고, 돌아올 때 필터·페이지·스크롤 위치가
          복원됩니다.
        </p>
      </section>

      {archiveQuery.error ? (
        <InlineAlert
          actions={
            <Button onClick={() => void archiveQuery.refetch()} type='button'>
              다시 시도
            </Button>
          }
          title='아카이브 검색 결과를 불러오지 못했습니다'
          tone='danger'
        >
          필터와 이전 검색 결과는 그대로 유지됩니다. 잠시 후 다시 시도해 주세요.
        </InlineAlert>
      ) : null}

      <ArchiveSearchFilters
        applied={{ from: applied.from, to: applied.to, status: applied.status }}
        onApply={handleApply}
        onReset={handleReset}
      />

      <ArchiveResultsCard
        applied={applied}
        data={displayData}
        isFetching={archiveQuery.isFetching}
        isInitialLoading={isInitialLoading}
        onPageChange={handlePageChange}
        onReset={handleReset}
        resultsHeadingRef={resultsHeadingRef}
        searchParams={searchParams}
      />
    </div>
  );
}

function ArchiveResultsCard({
  applied,
  data,
  isFetching,
  isInitialLoading,
  onPageChange,
  onReset,
  resultsHeadingRef,
  searchParams,
}: {
  applied: { from: string; to: string; status: string; page: number };
  data: ArchiveListView | null;
  isFetching: boolean;
  isInitialLoading: boolean;
  onPageChange: (page: number) => void;
  onReset: () => void;
  resultsHeadingRef: RefObject<HTMLHeadingElement | null>;
  searchParams: URLSearchParams;
}) {
  const announce = useAnnounce();
  const rows = data?.rows ?? [];

  return (
    // B6: list panels (관련 기사/실행 이력/검색 결과) carry 0 padding on the
    // panel itself — the header row, body, and pagination each own theirs.
    <Card
      aria-busy={isInitialLoading || undefined}
      className='flex min-w-0 flex-col overflow-hidden'
    >
      <div className='flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--line)] px-4 py-3.5 sm:px-[18px]'>
        <div className='flex flex-wrap items-center gap-2'>
          {/* parity cycle A3: per-block card-heading size (see
              archive-search-filters.tsx's comment) — "검색 결과" measures
              14.5px in the design, not the README §6 17px scale. */}
          <h2
            className='m-0 scroll-mt-24 text-[14.5px] font-semibold text-[color:var(--text)] focus:outline-none'
            id='archive-results-heading'
            ref={resultsHeadingRef}
            tabIndex={-1}
          >
            검색 결과
          </h2>
          {data ? (
            <span className='mono text-[12.5px] font-semibold text-[color:var(--text-soft)]'>
              {formatInteger(data.totalCount)}건
            </span>
          ) : null}
          {/* D5: "1–20 / 46" range lives next to the results heading, not
              beside the pager (see Pagination's own comment). */}
          {data && data.totalCount > 0 ? (
            <span className='mono text-[11.5px] text-[color:var(--text-faint)]'>
              {(data.page - 1) * PAGE_SIZE + 1}–
              {Math.min(data.page * PAGE_SIZE, data.totalCount)} /{' '}
              {data.totalCount}
            </span>
          ) : null}
        </div>
        {isFetching && !isInitialLoading ? <RefetchBadge /> : null}
      </div>

      {isInitialLoading ? (
        <div className='flex min-w-0 flex-col gap-4 p-4 sm:p-[18px]'>
          <p className='m-0 text-[13.5px] text-[color:var(--text-soft)]'>
            결과를 불러오는 중입니다. 필터는 그대로 유지됩니다.
          </p>
          <SkeletonTableRows cols={4} rows={8} />
        </div>
      ) : data && rows.length > 0 ? (
        <ArchiveResultsTable
          filters={applied}
          rows={rows}
          scrollSearch={searchParams.toString()}
        />
      ) : data && rows.length === 0 ? (
        <div className='p-4 sm:p-[18px]'>
          <EmptyState
            actions={
              <Button onClick={onReset} type='button' variant='ghost'>
                필터 초기화
              </Button>
            }
            description='선택한 기간과 상태 조건에 맞는 스냅샷이 없습니다. 필터를 조정하거나 초기화해 보세요.'
            kind='search-results'
            title='조건에 맞는 스냅샷이 없습니다'
          />
        </div>
      ) : null}

      {data ? (
        <Pagination
          className='px-4 py-3 sm:px-[18px]'
          onAnnounce={announce}
          onPageChange={onPageChange}
          page={data.page}
          totalPages={data.totalPages}
        />
      ) : null}
    </Card>
  );
}
