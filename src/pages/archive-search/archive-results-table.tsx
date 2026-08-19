import type { MouseEvent } from 'react';

import {
  buildScrollKey,
  saveScrollPosition,
} from '@/components/shell/scroll-restoration';
import { StatusBadge } from '@/components/state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScrollWrapper,
} from '@/components/ui/table';

import { buildUrl, navigate, withBasePath } from '../../lib/router';
import type { ArchiveRecord } from '../../lib/view-models';

export type ArchiveRowFilters = {
  from: string;
  to: string;
  status: string;
  market?: 'US' | 'KR' | '';
  themes?: readonly string[];
  q?: string;
  page: number;
};

/** Row links carry applied filters so Archive Detail can restore the search. */
function getArchiveDetailHref(
  record: ArchiveRecord,
  filters: ArchiveRowFilters
) {
  return buildUrl(`/market/archive/${record.businessDate}`, {
    pageId: record.pageId,
    from: filters.from,
    to: filters.to,
    status: filters.status || undefined,
    market: filters.market || undefined,
    theme: filters.themes,
    q: filters.q || undefined,
    page: filters.page,
  });
}

/** Saves this page's scroll before opening a row; Back restores it. */
function createRowOpenHandler(href: string, scrollSearch: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    saveScrollPosition(buildScrollKey('/market/archive/search', scrollSearch));
    navigate(href);
  };
}

/**
 * `record.detail` is the raw per-page `partialMessage` from the backend
 * (see `src/lib/mappers/archive.ts`) — the same unfiltered pipeline-sentence
 * shape as `snapshot.partialMessage`, which `partial-banner.tsx` gates
 * behind `canViewOps`, and as the per-market `metadata.partialMessage` its
 * "누락된 데이터" details row gates via `missingDataDetailCopy`
 * (`src/lib/audience-copy.ts`) (it can read like "뉴스 수집 단계에서
 * provider 타임아웃이 발생했습니다."). This subline must follow the same
 * rule: never render it to a regular user.
 */
function ReasonSubline({
  record,
  canViewOps,
}: {
  record: ArchiveRecord;
  canViewOps: boolean;
}) {
  if (!canViewOps || !record.detail || record.status === 'READY') {
    return null;
  }

  return (
    <div className='wrap-anywhere mt-1 text-label text-faint'>
      {record.detail}
    </div>
  );
}

function GeneratedAtSubline({ record }: { record: ArchiveRecord }) {
  return (
    <div className='tnum mt-1 text-body-sm text-faint min-[1181px]:hidden'>
      생성 {record.generatedAt}
    </div>
  );
}

export function ArchiveResultsTable({
  rows,
  filters,
  scrollSearch,
  canViewOps,
}: {
  rows: ArchiveRecord[];
  filters: ArchiveRowFilters;
  scrollSearch: string;
  canViewOps: boolean;
}) {
  return (
    <TableScrollWrapper label='아카이브 검색 결과 표'>
      {/* The panel has no padding, so cells own their horizontal insets:
          18px at row edges and 12px between columns.

          하한 폭을 인라인 `minWidth` prop 대신 클래스로 거는 이유: style
          속성은 미디어 쿼리를 못 탄다. 520px는 열이 서로 밀리지 않는 하한인데,
          `sm` 아래에서는 상태 열이 기준일 칸 안의 배지로 내려가 열이 둘만
          남는다. 그때까지 520px를 유지하면 남지도 않은 열 때문에 가로
          스크롤이 생기고, "그날 브리프가 온전했는가"라는 이 표의 핵심 정보가
          화면 밖으로 밀려난다.

          `min-w-0`을 함께 걸지 말 것. `base.css`의 `.min-w-0`은 레이어 밖에
          선언되어 있어서 `@layer utilities` 안의 Tailwind 유틸리티를 전부
          이긴다 — `sm:min-w-[520px]`이 생성되어 있어도 계산값은 0px로 남는다.
          기본값 `auto`면 충분하고, 실제로 그래야 이 분기가 동작한다. */}
      <Table
        aria-labelledby='archive-results-heading'
        className='sm:min-w-[520px]'
      >
        <TableHeader>
          <TableRow>
            <TableHead className='h-auto py-[9px] pr-3 pl-[18px]'>
              기준일
            </TableHead>
            <TableHead className='h-auto' padding='compact'>
              글로벌 헤드라인
            </TableHead>
            <TableHead
              className='hidden h-auto sm:table-cell'
              padding='compact'
            >
              상태
            </TableHead>
            {/* Keep 생성 시각 left-aligned with the column content. */}
            <TableHead className='hidden h-auto py-[9px] pr-[18px] pl-3 text-left min-[1181px]:table-cell'>
              생성 시각
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((record) => {
            const href = getArchiveDetailHref(record, filters);
            const onOpen = createRowOpenHandler(href, scrollSearch);

            return (
              <TableRow key={record.pageId}>
                {/* This dense table uses 12px vertical cell padding. */}
                <TableCell className='py-3 pr-3 pl-[18px] align-top'>
                  <a
                    /* 표 하한 폭이 `sm` 아래에서 풀리므로 기준일 칸이 내용에
                       맞춰 좁아진다. ISO 날짜는 한 덩어리로 읽히는 값이라
                       "2026-07-" / "26"으로 끊기면 세로로 훑는 동작이 깨진다. */
                    className='tap-target tnum justify-start whitespace-nowrap text-body font-semibold text-fg underline-offset-2 hover:text-[color:var(--primary)] hover:underline'
                    href={withBasePath(href)}
                    onClick={onOpen}
                  >
                    {/* Render the business date in monospaced ISO format. */}
                    {record.businessDate}
                  </a>
                  {/* 좁은 화면에서 상태 열을 대신한다. 헤드라인 밑이 아니라
                      날짜 밑에 붙는 것이 핵심이다 — 회고 사용자는 날짜를
                      세로로 훑으므로, 날짜와 상태가 한 덩어리로 읽혀야 한다. */}
                  <div className='mt-1.5 sm:hidden'>
                    <StatusBadge size='sm' status={record.status} />
                  </div>
                  {/* 내부 식별자. 바로 아래 `ReasonSubline`과 같은 게이트를
                      쓴다 — 이 줄만 무조건 렌더링되고 있었다. */}
                  {canViewOps ? (
                    <div className='tnum mt-0 text-label text-faint'>
                      pageId {record.pageId}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className='py-3 px-3 align-top'>
                  <a
                    className='tap-target-text wrap-anywhere text-pretty font-normal text-fg underline-offset-2 hover:text-[color:var(--primary)] hover:underline'
                    href={withBasePath(href)}
                    onClick={onOpen}
                  >
                    {record.headline}
                  </a>
                  <ReasonSubline canViewOps={canViewOps} record={record} />
                  <GeneratedAtSubline record={record} />
                </TableCell>
                <TableCell className='hidden py-3 px-3 align-top sm:table-cell'>
                  {/* Use the compact row-level badge size. */}
                  <StatusBadge size='sm' status={record.status} />
                </TableCell>
                <TableCell className='tnum hidden py-3 pr-[18px] pl-3 text-left text-label whitespace-nowrap text-fg-soft min-[1181px]:table-cell'>
                  {record.generatedAt}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableScrollWrapper>
  );
}
