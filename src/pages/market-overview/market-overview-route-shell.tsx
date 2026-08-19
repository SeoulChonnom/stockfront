import type { ReactNode } from 'react';

import { ArchiveModeBand } from './archive-mode-band';
import { extractFilterQuery } from './navigation';
import { useAdjacentNavigation } from './use-adjacent-navigation';

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
  // This shell renders while the requested page itself failed to load
  // (error or no-data — the pure loading state uses a separate skeleton),
  // so there is no daily-page response to read `navigation` off of. The
  // same date the user requested is still known, so this calls the
  // standalone `GET /pages/navigation` endpoint (B-5) rather than guessing
  // via calendar arithmetic. Scoped off via `enabled` so the Latest-mode
  // error path never fires it (hooks can't be called conditionally, so the
  // gate lives on the query, not on this call).
  const navigation = useAdjacentNavigation(businessDate ?? '', isArchive);

  return (
    <div className='flex flex-col gap-[var(--gap)]'>
      {isArchive ? (
        <ArchiveModeBand
          businessDate={businessDate}
          filterQuery={extractFilterQuery(searchParams)}
          navigation={navigation}
          pageId={pageId}
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
          <span className='tnum text-body font-semibold'>
            {businessDate ?? '확인할 수 없음'}
          </span>
        </div>

        <h1
          className='m-0 text-h1 font-semibold text-fg'
          id='page-title'
          tabIndex={-1}
        >
          {isArchive ? `${businessDate} 시장 브리프` : '최신 시장 브리프'}
        </h1>

        {!isArchive ? (
          <p className='measure-error m-0 text-body text-fg-soft'>
            최신 브리프의 기준일을 확인할 수 없습니다.
          </p>
        ) : null}
      </section>

      <div>{children}</div>
    </div>
  );
}
