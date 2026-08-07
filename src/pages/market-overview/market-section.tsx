import type { MarketSnapshot } from '@/lib/view-models';

import { MarketAnalysisBlock } from './market-analysis-block';
import { MarketArticleLinks } from './market-article-links';
import { MarketIndexTable } from './market-index-table';
import { MarketIssueList } from './market-issue-list';
import type { ClusterOriginQuery } from './navigation';

/**
 * 시장 섹션 — README §7-2 item 3. `markets[]`의 DTO 순서(미국 → 한국)를
 * 그대로 유지해 map으로 순회한다.
 *
 * The market-type code is already mapped by the view model and rendered in
 * this section header.
 */

const NO_NARRATIVE_COPY =
  '이 시장의 요약이 생성되지 않았습니다. 수집된 기사가 임계값에 미달했거나 AI 요약이 실패한 경우입니다. 지수와 원문은 아래에서 그대로 확인할 수 있습니다.';

export type MarketSectionProps = {
  market: MarketSnapshot['markets'][number];
  index: number;
  originQuery: ClusterOriginQuery;
  currentPathname: string;
  currentSearch: string;
};

export function MarketSection({
  market,
  index,
  originQuery,
  currentPathname,
  currentSearch,
}: MarketSectionProps) {
  const headingId = `mk-section-heading-${index}`;
  const metadata = market.metadata;
  const hasNarrative = (market.summaryBody ?? '').trim().length > 0;

  return (
    <section
      aria-labelledby={headingId}
      className='flex min-w-0 scroll-mt-4 flex-col overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)]'
      id={`mk-section-${index}`}
    >
      <div className='flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b border-[color:var(--line)] px-[18px] py-4'>
        {/* Show the market scope before its name. */}
        {market.marketType ? (
          <span className='mono rounded-[var(--r-sm)] border border-[color:var(--line-strong)] px-1.75 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-[color:var(--text-soft)]'>
            {market.marketType}
          </span>
        ) : null}
        <h2
          className='m-0 text-[17px] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]'
          id={headingId}
          tabIndex={-1}
        >
          {market.label}
        </h2>
        {market.summaryTitle ? (
          <span className='text-pretty text-[14px] text-[color:var(--text-soft)]'>
            — {market.summaryTitle}
          </span>
        ) : null}
        {metadata ? (
          <span className='mono ml-auto text-[11.5px] text-[color:var(--text-faint)]'>
            원문 {metadata.rawNewsCount}건 · 정제 {metadata.processedNewsCount}
            건 · 클러스터 {metadata.clusterCount}건
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
          <p className='m-0 text-[13px] text-[color:var(--text)]'>
            <strong className='font-semibold'>누락 </strong>
            {metadata.partialMessage}
          </p>
        </div>
      ) : null}

      <div className='flex flex-col gap-3.5 px-[18px] py-4'>
        {hasNarrative ? (
          <p className='measure-summary text-pretty wrap-anywhere m-0 text-[length:var(--fs-lead)] leading-[var(--lh-lead)] text-[color:var(--text)]'>
            {market.summaryBody}
          </p>
        ) : null}
        <MarketAnalysisBlock analysis={market.analysis} />
        {hasNarrative ? null : (
          <p className='m-0 rounded-[var(--r-md)] border border-dashed border-[color:var(--line-strong)] px-3.5 py-3 text-[13px] text-[color:var(--text-faint)]'>
            {NO_NARRATIVE_COPY}
          </p>
        )}
      </div>

      <div className='flex items-baseline gap-2.5 border-t border-[color:var(--line)] bg-[color:var(--surface-2)] px-[18px] py-3'>
        <h3 className='m-0 text-[13.5px] font-semibold'>대표 지수</h3>
        <span className='mono text-[11.5px] text-[color:var(--text-faint)]'>
          {market.indices.length}종
        </span>
      </div>
      <MarketIndexTable indices={market.indices} />

      <div className='flex items-baseline gap-2.5 border-t border-[color:var(--line)] bg-[color:var(--surface-2)] px-[18px] py-3'>
        <h3 className='m-0 text-[13.5px] font-semibold'>핵심 이슈</h3>
        <span className='mono text-[11.5px] text-[color:var(--text-faint)]'>
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
