import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

import { useAnnounce } from '@/components/shell/use-announce';
import {
  InlineAlert,
  RefetchBadge,
  SkeletonTableRows,
} from '@/components/state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { ApiError } from '@/lib/api/client';
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

type ArchiveSearchErrorPresentation = {
  code: string;
  title: string;
  message: string;
};

function getArchiveSearchErrorPresentation(
  error: Error
): ArchiveSearchErrorPresentation {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return {
        code: 'NETWORK_ERROR',
        title: '네트워크에 연결할 수 없습니다',
        message:
          '연결을 확인한 뒤 다시 시도해 주세요. 필터와 마지막 검색 결과는 그대로 유지됩니다.',
      };
    }

    if (error.status === 429) {
      return {
        code: '429 · RATE_LIMITED',
        title: '요청이 너무 많습니다',
        message: '잠시 기다린 뒤 다시 시도해 주세요.',
      };
    }

    if (error.status >= 500) {
      return {
        code: `${error.status} · INTERNAL_ERROR`,
        title: '데이터를 불러오지 못했습니다',
        message:
          '서버가 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      };
    }

    return {
      code: `${error.status} · REQUEST_FAILED`,
      title: '아카이브 요청을 처리하지 못했습니다',
      message: error.message,
    };
  }

  return {
    code: 'REQUEST_FAILED',
    title: '아카이브 요청을 처리하지 못했습니다',
    message: error.message || '알 수 없는 오류가 발생했습니다.',
  };
}

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

  // Keep the last successful page while a new query key loads or errors.
  const displayData = useLastGoodData(archiveQuery.data);
  const hasData = displayData !== null;
  const isInitialLoading = archiveQuery.isLoading && !hasData;
  const errorPresentation = archiveQuery.error
    ? getArchiveSearchErrorPresentation(archiveQuery.error)
    : null;

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
    // jsdom does not implement scrollIntoView.
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
          className='m-0 text-[22px] font-semibold text-fg focus:outline-none'
          id='page-title'
          tabIndex={-1}
        >
          아카이브
        </h1>
        {/* Keep the summary measure at 70ch rather than the shared 76ch.
            The title section's 6px flex gap replaces paragraph margin. */}
        <p className='wrap-anywhere max-w-[70ch] text-body text-fg-soft'>
          기준일 범위와 생성 상태로 과거 스냅샷을 찾습니다. 결과를 열면 해당
          날짜의 시장 브리프로 이동하고, 돌아올 때 필터·페이지·스크롤 위치가
          복원됩니다.
        </p>
      </section>

      <ArchiveSearchFilters
        applied={{ from: applied.from, to: applied.to, status: applied.status }}
        onApply={handleApply}
        onReset={handleReset}
      />

      {errorPresentation ? (
        <InlineAlert
          actions={
            <Button
              className='px-4 text-[13px]'
              onClick={() => void archiveQuery.refetch()}
              size='sm'
              type='button'
            >
              다시 시도
            </Button>
          }
          className='bg-[color:var(--surface)] px-[18px] py-4 [&_h3]:mb-1.5 [&_h3]:text-card-heading [&_h3]:text-fg'
          title={
            <span className='flex flex-wrap items-center gap-2.5'>
              <span>{errorPresentation.title}</span>
              <span className='mono rounded-[var(--r-sm)] border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] px-2 py-0.5 text-caption font-semibold text-[color:var(--danger)]'>
                {errorPresentation.code}
              </span>
            </span>
          }
          tone='danger'
        >
          {errorPresentation.message}
        </InlineAlert>
      ) : null}

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
    <Card
      aria-busy={isInitialLoading || undefined}
      className='flex min-w-0 flex-col overflow-hidden'
    >
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-[18px] py-3.5'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
          {/* Keep this dense card heading at 14.5px. */}
          <h2
            className='m-0 scroll-mt-24 text-card-heading font-semibold text-fg focus:outline-none'
            id='archive-results-heading'
            ref={resultsHeadingRef}
            tabIndex={-1}
          >
            검색 결과
          </h2>
          {data ? (
            <span className='mono text-body-sm font-semibold text-fg'>
              {formatInteger(data.totalCount)}건
            </span>
          ) : null}
          {/* The result range lives next to the heading rather than beside the pager. */}
          {data && data.totalCount > 0 ? (
            <span className='mono text-caption text-faint'>
              {(data.page - 1) * PAGE_SIZE + 1}–
              {Math.min(data.page * PAGE_SIZE, data.totalCount)} /{' '}
              {data.totalCount}
            </span>
          ) : null}
        </div>
        {isFetching && !isInitialLoading ? <RefetchBadge /> : null}
      </div>

      {isInitialLoading ? (
        <div className='flex min-w-0 flex-col gap-2.5 p-[18px]' role='status'>
          <SkeletonTableRows cols={4} rows={8} />
          <p className='m-0 text-body-sm text-faint'>
            결과를 불러오는 중입니다. 필터는 그대로 유지됩니다.
          </p>
        </div>
      ) : data && rows.length > 0 ? (
        <ArchiveResultsTable
          filters={applied}
          rows={rows}
          scrollSearch={searchParams.toString()}
        />
      ) : data && rows.length === 0 ? (
        <div className='px-5 py-8 text-left'>
          <h3 className='m-0 mb-2 text-[15.5px] font-semibold text-fg'>
            조건에 맞는 스냅샷이 없습니다
          </h3>
          <p className='wrap-anywhere m-0 mb-3.5 max-w-[60ch] text-body text-fg-soft'>
            선택한 기간에 생성된 브리프가 없거나, 상태 필터가 결과를 모두
            제외했습니다. 기간을 넓히거나 상태 필터를 해제해 보세요.
          </p>
          <Button
            className='px-4 text-[13px]'
            onClick={onReset}
            size='sm'
            type='button'
            variant='secondary'
          >
            필터 초기화
          </Button>
        </div>
      ) : null}

      {data ? (
        <Pagination
          className='px-[18px] py-3'
          onAnnounce={announce}
          onPageChange={onPageChange}
          page={data.page}
          totalPages={data.totalPages}
        />
      ) : null}
    </Card>
  );
}
