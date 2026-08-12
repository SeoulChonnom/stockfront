import type { ReactNode } from 'react';

import { ArchiveModeBand } from './archive-mode-band';
import { getTodayBusinessDateKst, shiftBusinessDate } from './date-utils';
import { extractFilterQuery } from './navigation';

export type MarketOverviewRouteShellProps = {
  businessDate: string | null;
  children: ReactNode;
  mode: 'latest' | 'archive';
  pageId?: number | null;
  searchParams?: URLSearchParams;
};

/** Keeps route identity visible while the market data region is unavailable. */
export function MarketOverviewRouteShell({
  businessDate,
  children,
  mode,
  pageId = null,
  searchParams = new URLSearchParams(),
}: MarketOverviewRouteShellProps) {
  const isArchive = mode === 'archive' && businessDate !== null;
  // No adjacent-date endpoint exists (D-05); this shell renders while the
  // page itself is unavailable (loading/error), so it keeps the coarser
  // "not later than today" heuristic rather than firing an extra list query
  // from an already-broken page.
  const rawNextDate = isArchive ? shiftBusinessDate(businessDate, 1) : null;
  const nextDate =
    rawNextDate && rawNextDate <= getTodayBusinessDateKst()
      ? rawNextDate
      : null;

  return (
    <div className='flex flex-col gap-[var(--gap)]'>
      {isArchive ? (
        <ArchiveModeBand
          businessDate={businessDate}
          filterQuery={extractFilterQuery(searchParams)}
          nextDate={nextDate}
          pageId={pageId}
          prevDate={shiftBusinessDate(businessDate, -1)}
          versionNo={null}
        />
      ) : null}

      <section
        aria-labelledby='page-title'
        className='flex flex-col gap-3 rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] p-5'
      >
        <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
          <span className='text-body-sm font-semibold text-faint'>
            {isArchive ? '아카이브 스냅샷' : '최신 브리프'}
          </span>
          <span className='text-body-sm text-faint'>기준일</span>
          <span className='mono text-[14px] font-semibold'>
            {businessDate ?? '확인할 수 없음'}
          </span>
        </div>

        <h1
          className='m-0 text-[15px] font-semibold tracking-[0.01em] text-faint'
          id='page-title'
          tabIndex={-1}
        >
          {isArchive ? `${businessDate} 시장 브리프` : '최신 시장 브리프'}
        </h1>

        {!isArchive ? (
          <p className='m-0 text-body text-fg-soft'>
            최신 브리프의 기준일을 확인할 수 없습니다.
          </p>
        ) : null}
      </section>

      <div>{children}</div>
    </div>
  );
}
