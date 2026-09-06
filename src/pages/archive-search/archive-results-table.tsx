import { FilterIcon } from 'lucide-react';
import type { MouseEvent } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/domain/data-table';
import { TableScrollWrapper } from '@/components/domain/table-scroll-wrapper';
import {
  buildScrollKey,
  saveScrollPosition,
} from '@/components/shell/scroll-restoration';
import { StatusBadge } from '@/components/state';

import { getTodayIso } from '@/lib/kst-date';
import { buildUrl, navigate, withBasePath } from '@/lib/router';
import type { ArchiveRecord } from '@/lib/view-models';

export type MonthRange = { from: string; to: string };

export type ArchiveRowFilters = {
  from: string;
  to: string;
  status: string;
  market?: 'US' | 'KR' | '';
  themes?: readonly string[];
  q?: string;
  page: number;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * 회고 사용자는 "지난 금요일에 무슨 일이 있었지" 처럼 요일로 그날을
 * 떠올린다. `businessDate`는 KST 달력일이므로 `new Date('YYYY-MM-DD')`로
 * 파싱하면 UTC로 해석되어 자정 부근에서 요일이 하루 밀린다 — 문자열을
 * 직접 분해해 UTC 자정으로 고정한 뒤 `getUTCDay()`만 읽는다.
 */
function getKstWeekdayLabel(businessDate: string): string {
  const [year, month, day] = businessDate.split('-').map(Number);
  return WEEKDAY_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

type MonthGroup = {
  key: string;
  year: string;
  month: string;
  records: ArchiveRecord[];
};

/**
 * 행은 `businessDate` 내림차순으로 도착한다 — 그룹을 연-월 키로만 묶고
 * 도착 순서를 그대로 유지하면 정렬을 다시 계산할 필요가 없다. 문자열
 * 슬라이싱만 쓰는 이유는 위 요일 계산과 같다: `Date` 생성자는 경계에서
 * KST 기준월을 UTC 기준월로 조용히 바꿔치기한다.
 */
function groupRowsByMonth(rows: ArchiveRecord[]): MonthGroup[] {
  const groups: MonthGroup[] = [];

  for (const record of rows) {
    const year = record.businessDate.slice(0, 4);
    const month = record.businessDate.slice(5, 7);
    const key = `${year}-${month}`;
    const lastGroup = groups.at(-1);

    if (lastGroup?.key === key) {
      lastGroup.records.push(record);
    } else {
      groups.push({ key, year, month, records: [record] });
    }
  }

  return groups;
}

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
    <div className='tnum mt-1 text-label leading-snug text-faint min-[1181px]:hidden'>
      생성 {record.generatedAt}
    </div>
  );
}

/** UTC 계산만 쓴다 — 위 요일 헬퍼와 같은 이유로, `Date` 생성자가 로컬/UTC로 달을 바꿔치기하는 걸 피한다. */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * 월 헤더를 눌렀을 때 검색할 범위. 이번 달처럼 아직 끝나지 않은 달은
 * 자연스러운 말일(예: 31일)이 미래 날짜가 되어 `validateArchiveFilters`가
 * 거부하므로, `getTodayIso()`로 클램프한다.
 */
function getMonthRange(year: string, month: string): MonthRange {
  const today = getTodayIso();
  const from = `${year}-${month}-01`;
  const lastDay = getLastDayOfMonth(Number(year), Number(month));
  const naturalTo = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  return { from, to: naturalTo > today ? today : naturalTo };
}

/**
 * 페이지 하나가 한두 달에 걸치므로, 그룹이 하나뿐이어도 헤더는 그대로
 * 낸다 — 건수 자체가 정보이고, 조건부로 숨기면 "이 페이지가 몇 달치인지"
 * 매번 다시 파악해야 한다. `scope='colgroup'`은 아래 데이터 행들이 이
 * 헤더에 종속된 그룹임을 스크린리더에 알린다.
 *
 * 이 헤더는 결과 영역 안이라 클릭하면 바로 이동한다 — `ArchiveFilterChips`의
 * 칩, 그리고 이제 필터 카드의 기간 프리셋과도 같은 규칙이다. 건수는 접근
 * 이름에 넣지 않는다: 이 건수는 "이 페이지 안에서"의 건수라 좁힌 뒤의 전체
 * 결과 수와 달라서, 이름에 넣으면 곧 거짓말이 된다.
 *
 * 버튼 문구는 원래 호버·포커스가 있어야만 밑줄이 붙어 평시엔 그냥 텍스트로
 * 보였다 — 필터 아이콘을 항상 붙여 결과 행과 구분되는 조작 가능한 대상임을
 * 쉬는 상태에서도 드러낸다. 결과 표의 핵심(행 링크)보다는 조용해야 하는
 * 보조 컨트롤이라 크기를 작게, 색을 헤더 기본 색(`text-fg-soft`)에 맞춘다.
 * 아이콘은 `aria-hidden`이라 접근 이름(`aria-label`)에는 영향을 주지 않는다.
 */
function MonthGroupHeaderRow({
  year,
  month,
  count,
  onSelectMonth,
}: {
  year: string;
  month: string;
  count: number;
  onSelectMonth?: (range: MonthRange) => void;
}) {
  return (
    <TableRow>
      <TableHead
        className='h-auto border-b border-line bg-surface-2 py-2 pr-[18px] pl-[18px] text-left text-label font-semibold text-fg-soft'
        colSpan={4}
        scope='colgroup'
      >
        <div className='flex items-baseline justify-between gap-2'>
          <button
            aria-label={`${Number(year)}년 ${Number(month)}월만 보기`}
            className='tap-control inline-flex items-center gap-1 justify-start underline-offset-2 hover:text-primary hover:underline'
            onClick={() => onSelectMonth?.(getMonthRange(year, month))}
            type='button'
          >
            <FilterIcon aria-hidden='true' className='size-3 shrink-0' />
            {Number(year)}년 {Number(month)}월
          </button>
          <span className='tnum font-normal text-faint'>{count}건</span>
        </div>
      </TableHead>
    </TableRow>
  );
}

/**
 * 링크 두 개를 하나로 합치지 않는다 — `<tr>`에 클릭 핸들러를 얹으면
 * 키보드 포커스와 가운데 클릭(새 탭 열기)이 깨진다. 대신 `group`으로
 * 행 전체의 호버 상태를 두 링크에 전파한다: 어느 링크 위에서 호버해도
 * 나머지 링크가 같이 반응해야 "행 전체가 대상"이라는 느낌이 난다.
 */
function ArchiveDataRow({
  record,
  filters,
  scrollSearch,
  canViewOps,
}: {
  record: ArchiveRecord;
  filters: ArchiveRowFilters;
  scrollSearch: string;
  canViewOps: boolean;
}) {
  const href = getArchiveDetailHref(record, filters);
  const onOpen = createRowOpenHandler(href, scrollSearch);

  return (
    <TableRow className='group hover:bg-surface-2'>
      {/* This dense table uses 12px vertical cell padding. */}
      <TableCell className='py-3 pr-3 pl-[18px] align-top'>
        <a
          /* 표 하한 폭이 `sm` 아래에서 풀리므로 기준일 칸이 내용에
             맞춰 좁아진다. ISO 날짜는 한 덩어리로 읽히는 값이라
             "2026-07-" / "26"으로 끊기면 세로로 훑는 동작이 깨진다. */
          className='tap-target tnum justify-start whitespace-nowrap text-body font-semibold text-fg underline-offset-2 hover:text-primary hover:underline group-hover:text-primary group-hover:underline'
          href={withBasePath(href)}
          onClick={onOpen}
          /* 이 링크와 헤드라인 링크는 같은 href를 가리킨다 — 둘 다 탭
             순서에 두면 목적지 20개에 도달하는 데 한 페이지당 40번
             탭해야 한다. 헤드라인 쪽이 더 풍부한 접근 이름을 갖고 있으니
             그쪽만 탭 순서에 남기고 이 링크는 뺀다. 마우스 클릭·가운데
             클릭·우클릭은 href가 그대로라 여기서도 계속 동작한다. */
          tabIndex={-1}
        >
          {/* Render the business date in monospaced ISO format. */}
          {record.businessDate}{' '}
          {/* 요일은 별도 span으로 분리하되 같은 링크 안에 둔다 — 회고
              사용자가 "지난 금요일"처럼 요일로 그날을 떠올리기 때문에
              날짜 옆에 바로 있어야 한다. 문자 공백을 명시하는 이유: 마진은
              시각적으로만 벌어지고 접근성 트리의 링크 이름에는 반영되지
              않는다. */}
          <span className='font-normal text-label text-faint'>
            ({getKstWeekdayLabel(record.businessDate)})
          </span>
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
          <div className='tnum mt-0 text-label leading-snug text-faint'>
            pageId {record.pageId}
          </div>
        ) : null}
      </TableCell>
      <TableCell className='py-3 px-3 align-top'>
        <a
          className='tap-target-text wrap-anywhere text-pretty font-normal text-fg underline-offset-2 hover:text-primary hover:underline group-hover:text-primary group-hover:underline'
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
}

export function ArchiveResultsTable({
  rows,
  filters,
  scrollSearch,
  canViewOps,
  onSelectMonth,
}: {
  rows: ArchiveRecord[];
  filters: ArchiveRowFilters;
  scrollSearch: string;
  canViewOps: boolean;
  onSelectMonth?: (range: MonthRange) => void;
}) {
  const groups = groupRowsByMonth(rows);

  return (
    <TableScrollWrapper label='아카이브 검색 결과 표'>
      {/* The panel has no padding, so cells own their horizontal insets:
          18px at row edges and 12px between columns.

          하한 폭을 인라인 `minWidth` prop 대신 클래스로 거는 이유: style
          속성은 미디어 쿼리를 못 탄다. 520px는 열이 서로 밀리지 않는 하한인데,
          `sm` 아래에서는 상태 열이 기준일 칸 안의 배지로 내려가 열이 둘만
          남는다. 그때까지 520px를 유지하면 남지도 않은 열 때문에 가로
          스크롤이 생기고, "그날 브리프가 온전했는가"라는 이 표의 핵심 정보가
          화면 밖으로 밀려난다. */}
      <Table
        aria-labelledby='archive-results-heading'
        className='sm:min-w-[520px]'
      >
        <TableHeader>
          <TableRow>
            <TableHead className='h-auto py-[9px] pr-3 pl-[18px]'>
              기준일
            </TableHead>
            <TableHead className='h-auto'>글로벌 헤드라인</TableHead>
            <TableHead className='hidden h-auto sm:table-cell'>상태</TableHead>
            {/* Keep 생성 시각 left-aligned with the column content. */}
            <TableHead className='hidden h-auto py-[9px] pr-[18px] pl-3 text-left min-[1181px]:table-cell'>
              생성 시각
            </TableHead>
          </TableRow>
        </TableHeader>
        {/* 페이지 하나가 한두 달치라 `<tbody>`를 월 그룹 단위로 나눈다 —
            여러 `<tbody>`는 유효한 HTML이고, 헤더 행이 그 그룹의 첫 행이
            되어 스크린리더의 "표 개요" 탐색에서도 그룹 경계가 드러난다. */}
        {groups.map((group) => (
          <TableBody key={group.key}>
            <MonthGroupHeaderRow
              count={group.records.length}
              month={group.month}
              onSelectMonth={onSelectMonth}
              year={group.year}
            />
            {group.records.map((record) => (
              <ArchiveDataRow
                canViewOps={canViewOps}
                filters={filters}
                key={record.pageId}
                record={record}
                scrollSearch={scrollSearch}
              />
            ))}
          </TableBody>
        ))}
      </Table>
    </TableScrollWrapper>
  );
}
