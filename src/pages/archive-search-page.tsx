import { PageMessage } from '../components/ui';
import { parseListFilters } from '../lib/app-state';
import { useArchiveList } from '../lib/query-hooks';
import { buildUrl, navigate } from '../lib/router';
import type { ArchiveRecord } from '../lib/view-models';
import { ArchivePagination } from './archive-search/archive-pagination';
import { ArchiveResultsTable } from './archive-search/archive-results-table';
import { ArchiveSearchFilters } from './archive-search/archive-search-filters';

const archiveSearchStatuses = ['READY', 'PARTIAL', 'FAILED'];

function buildArchiveSearchUrl(filters: {
  from: string;
  to: string;
  status: string;
  page: number;
}) {
  return buildUrl('/market/archive/search', filters);
}

export function ArchiveSearchPage({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const applied = parseListFilters(searchParams, {
    allowedStatuses: archiveSearchStatuses,
  });
  const archiveQuery = useArchiveList({
    fromDate: applied.from,
    toDate: applied.to,
    status: applied.status || undefined,
    page: applied.page,
    size: 4,
  });

  if (archiveQuery.isLoading) {
    return (
      <PageMessage
        description='아카이브 목록을 불러오는 중입니다.'
        title='Loading Archive Data'
      />
    );
  }

  if (archiveQuery.error) {
    return (
      <PageMessage
        description={archiveQuery.error.message}
        title='Archive Data Unavailable'
      />
    );
  }

  return (
    <ArchiveSearchContent
      key={`${applied.from}:${applied.to}:${applied.status}:${applied.page}`}
      applied={applied}
      currentPage={archiveQuery.data?.page ?? applied.page}
      filteredCount={archiveQuery.data?.totalCount ?? 0}
      rows={archiveQuery.data?.rows ?? []}
      totalPages={archiveQuery.data?.totalPages ?? 1}
    />
  );
}

function ArchiveSearchContent({
  applied,
  currentPage,
  filteredCount,
  rows,
  totalPages,
}: {
  applied: {
    from: string;
    to: string;
    status: string;
    page: number;
  };
  currentPage: number;
  filteredCount: number;
  rows: ArchiveRecord[];
  totalPages: number;
}) {
  return (
    <div className='page-stack'>
      <section className='page-intro'>
        <div>
          <span className='eyebrow'>Archive Search</span>
          <h1 id='page-title' tabIndex={-1}>
            과거 시장 기록 탐색
          </h1>
          <p>
            날짜 범위와 상태 기준으로 과거 요약 생성 결과를 검색합니다. 테이블
            결과는 상세 페이지 이동을 제목 셀 링크에만 부여해 접근성과 의미를
            분리했습니다.
          </p>
        </div>
      </section>

      <ArchiveSearchFilters
        initialFilters={applied}
        onApply={(filters) =>
          navigate(
            buildArchiveSearchUrl({
              from: filters.from,
              to: filters.to,
              status: filters.status,
              page: 1,
            })
          )
        }
      />

      <ArchiveResultsTable rows={rows} />

      <ArchivePagination
        currentPage={currentPage}
        filteredCount={filteredCount}
        onNext={() =>
          navigate(
            buildArchiveSearchUrl({
              from: applied.from,
              to: applied.to,
              status: applied.status,
              page: currentPage + 1,
            })
          )
        }
        onPrev={() =>
          navigate(
            buildArchiveSearchUrl({
              from: applied.from,
              to: applied.to,
              status: applied.status,
              page: currentPage - 1,
            })
          )
        }
        totalPages={totalPages}
        visibleCount={rows.length}
      />
    </div>
  );
}
