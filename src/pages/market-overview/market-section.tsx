import { noIndexDataCopy, noNarrativeCopy } from '@/lib/audience-copy';
import type { MarketSnapshot } from '@/lib/view-models';

import { MarketAnalysisBlock } from './market-analysis-block';
import { MarketArticleLinks } from './market-article-links';
import { MarketIndexCards } from './market-index-cards';
import { MarketIndexTable } from './market-index-table';
import { MarketIssueList } from './market-issue-list';
import { marketPanelId, marketTabId } from './market-tab-ids';
import type { ClusterOriginQuery } from './navigation';

/**
 * 시장 섹션. `markets[]`의 DTO 순서(미국 → 한국)를
 * 그대로 유지해 map으로 순회한다.
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
  const headingId = `mk-section-heading-${index}`;
  const metadata = market.metadata;
  const hasNarrative = (market.summaryBody ?? '').trim().length > 0;
  const hasIndices = market.indices.length > 0;
  const audience = { canViewOps };

  return (
    <section
      aria-labelledby={marketTabId(index)}
      className='flex min-w-0 flex-col overflow-hidden rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)]'
      id={marketPanelId(index)}
      role='tabpanel'
    >
      <div className='flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b border-line px-[18px] py-4'>
        {/* Show the market scope before its name. */}
        {market.marketType ? (
          <span className='mono rounded-[var(--r-sm)] border border-[color:var(--line-strong)] px-1.75 py-0.5 text-label font-semibold tracking-[0.08em] text-fg-soft'>
            {market.marketType}
          </span>
        ) : null}
        <h2
          className='m-0 text-[length:var(--fs-h2)] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]'
          id={headingId}
          tabIndex={-1}
        >
          {market.label}
        </h2>
        {market.summaryTitle ? (
          <span className='text-pretty text-[14px] text-fg-soft'>
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
          <p className='m-0 text-[13px] text-fg'>
            <strong className='font-semibold'>누락 </strong>
            {metadata.partialMessage}
          </p>
        </div>
      ) : null}

      <div className='flex flex-col gap-3.5 px-[18px] py-4'>
        {hasNarrative ? (
          <p className='measure-summary text-pretty wrap-anywhere m-0 text-[length:var(--fs-lead)] leading-[var(--lh-lead)] text-fg'>
            {market.summaryBody}
          </p>
        ) : null}
        <MarketAnalysisBlock analysis={market.analysis} />
        {hasNarrative ? null : (
          <p className='m-0 rounded-[var(--r-md)] border border-dashed border-[color:var(--line-strong)] px-3.5 py-3 text-[13px] text-faint'>
            {noNarrativeCopy(audience)}
          </p>
        )}
      </div>

      <div className='flex items-baseline gap-2.5 border-t border-line bg-[color:var(--surface-2)] px-[18px] py-3'>
        <h3 className='m-0 text-body font-semibold'>대표 지수</h3>
        <span className='mono text-caption text-faint'>
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
        <h3 className='m-0 text-body font-semibold'>핵심 이슈</h3>
        <span className='mono text-caption text-faint'>
          {market.clusters.length}건
        </span>
      </div>
      <MarketIssueList
        clusters={market.clusters}
        currentPathname={currentPathname}
        currentSearch={currentSearch}
        originQuery={originQuery}
      />

      <MarketArticleLinks links={market.articleLinks ?? []} />
    </section>
  );
}
