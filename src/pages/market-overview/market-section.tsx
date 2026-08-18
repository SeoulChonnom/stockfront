import { noIndexDataCopy, noNarrativeCopy } from '@/lib/audience-copy';
import type { MarketSnapshot } from '@/lib/view-models';

import { MarketAnalysisBlock } from './market-analysis-block';
import { MarketArticleLinks } from './market-article-links';
import { MarketIndexCards } from './market-index-cards';
import { MarketIndexTable } from './market-index-table';
import { MarketIssueList } from './market-issue-list';
import { marketHeadingId, marketSectionId } from './market-section-ids';
import type { ClusterOriginQuery } from './navigation';

/**
 * 시장 섹션. 화면 표시 순서는 `market-display-order.ts`가 정하고
 * (한국 먼저), 이 컴포넌트는 받은 시장 하나를 그린다. `index`는 표시
 * 위치가 아니라 `markets[]`의 원래 배열 인덱스다 — id와 `?market=`가
 * 그 값을 쓴다.
 *
 * 예전에는 탭 위젯의 패널이어서 `role='tabpanel'`을 달고 있었다. 이제는
 * 두 시장이 한 문서에 나란히 쌓이므로 평범한 `<section>`이다 — 브라우저
 * 검색·인쇄·스크린리더 훑기가 브리프 전체에 닿아야 하기 때문이다.
 *
 * The market-type code is already mapped by the view model and rendered in
 * this section header.
 */

export type MarketSectionProps = {
  market: MarketSnapshot['markets'][number];
  index: number;
  originQuery: ClusterOriginQuery;
  currentPathname: string;
  currentSearch: string;
  canViewOps: boolean;
};

export function MarketSection({
  market,
  index,
  originQuery,
  currentPathname,
  currentSearch,
  canViewOps,
}: MarketSectionProps) {
  const metadata = market.metadata;
  const hasNarrative = (market.summaryBody ?? '').trim().length > 0;
  const hasIndices = market.indices.length > 0;
  const audience = { canViewOps };

  return (
    <section
      aria-labelledby={marketHeadingId(index)}
      // 모바일 상단 헤더가 앵커 이동 시 제목을 가리지 않도록 오프셋을 준다.
      className='flex min-w-0 scroll-mt-[calc(var(--topbar-height)+8px)] flex-col overflow-hidden rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)]'
      id={marketSectionId(index)}
    >
      {/* 착지 표시는 카드 전체가 아니라 이 헤더 띠가 받는다
          (`src/lib/arrival-mark.ts`의 `resolveHost`). 섹션 전체를 칠하면
          화면 한 판이 물들어 표시가 아니라 상태로 읽힌다. */}
      <div
        className='flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b border-line px-[18px] py-4'
        data-arrival-host=''
      >
        {/* Show the market scope before its name. */}
        {market.marketType ? (
          <span className='tnum rounded-[var(--r-sm)] border border-[color:var(--line-strong)] px-1.75 py-0.5 text-label font-semibold tracking-caps text-fg-soft'>
            {market.marketType}
          </span>
        ) : null}
        <h2
          className='m-0 text-h2 font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]'
          id={marketHeadingId(index)}
          tabIndex={-1}
        >
          {market.label}
        </h2>
        {market.summaryTitle ? (
          <span className='text-pretty text-body text-fg-soft'>
            — {market.summaryTitle}
          </span>
        ) : null}
      </div>

      {metadata?.partialMessage ? (
        <div className='flex gap-2.5 border-b border-[color:var(--warning-line)] bg-[color:var(--warning-soft)] px-[18px] py-3'>
          <span
            aria-hidden='true'
            className='font-bold text-[color:var(--warning)]'
          >
            !
          </span>
          <p className='m-0 text-body text-fg'>
            <strong className='font-semibold'>누락 </strong>
            {metadata.partialMessage}
          </p>
        </div>
      ) : null}

      <div className='flex flex-col gap-3.5 px-[18px] py-4'>
        {hasNarrative ? (
          <p className='measure-summary text-pretty wrap-anywhere m-0 text-lead text-fg'>
            {market.summaryBody}
          </p>
        ) : null}
        <MarketAnalysisBlock analysis={market.analysis} />
        {hasNarrative ? null : (
          <p className='m-0 rounded-[var(--r-md)] border border-dashed border-[color:var(--line-strong)] px-3.5 py-3 text-body text-faint'>
            {noNarrativeCopy(audience)}
          </p>
        )}
      </div>

      <div className='flex items-baseline gap-2.5 border-t border-line bg-[color:var(--surface-2)] px-[18px] py-3'>
        <h3 className='m-0 text-card-heading font-semibold'>대표 지수</h3>
        <span className='tnum text-body-sm text-faint'>
          {market.indices.length}종
        </span>
      </div>
      <div className='hidden sm:block'>
        <MarketIndexTable canViewOps={canViewOps} indices={market.indices} />
      </div>
      <div className='sm:hidden'>
        {hasIndices ? (
          <MarketIndexCards indices={market.indices} />
        ) : (
          <p className='m-0 px-[18px] py-4 text-body text-faint'>
            {noIndexDataCopy(audience)}
          </p>
        )}
      </div>

      <div className='flex items-baseline gap-2.5 border-t border-line bg-[color:var(--surface-2)] px-[18px] py-3'>
        <h3 className='m-0 text-card-heading font-semibold'>핵심 이슈</h3>
        <span className='tnum text-body-sm text-faint'>
          {market.clusters.length}건
        </span>
      </div>
      <MarketIssueList
        canViewOps={canViewOps}
        clusters={market.clusters}
        currentPathname={currentPathname}
        currentSearch={currentSearch}
        originQuery={originQuery}
      />

      <MarketArticleLinks links={market.articleLinks ?? []} />
    </section>
  );
}
