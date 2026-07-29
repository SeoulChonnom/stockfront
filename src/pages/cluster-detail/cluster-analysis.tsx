import { Sparkles } from 'lucide-react';

/**
 * README §7-5 "AI 심층 분석" — spec calls for `summary.long`(14px) followed
 * by each `summary.analysis[]` paragraph with a left quote rule.
 * `summary.long`/`summary.short` are never surfaced on the `ClusterDetail`
 * view model (`mapClusterDetailToView` in `mappers.ts` drops
 * `response.summary.long` entirely and only folds `summary.short` into
 * `representative.sourceSummary`) — out of this phase's file ownership, so
 * this section renders `analysis[]` only. See `cluster-detail-page.tsx`'s
 * top comment for the full gap writeup.
 */
export function ClusterAnalysis({ analysis }: { analysis: string[] }) {
  return (
    <section
      aria-labelledby='cluster-analysis-heading'
      className='flex min-w-0 flex-col gap-4 rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5'
    >
      <h2
        className='m-0 flex items-center gap-2 text-[17px] font-semibold text-[color:var(--text)]'
        id='cluster-analysis-heading'
      >
        <Sparkles aria-hidden='true' size={17} />
        AI 심층 분석
      </h2>

      {analysis.length === 0 ? (
        <p className='measure-analysis wrap-anywhere m-0 text-[13.5px] text-[color:var(--text-soft)]'>
          이 이슈의 심층 분석이 아직 생성되지 않았습니다. AI 요약 단계가
          완료되면 이 영역에 표시됩니다.
        </p>
      ) : (
        <div className='flex flex-col gap-3'>
          {analysis.map((paragraph, index) => (
            <p
              className='measure-analysis wrap-anywhere m-0 border-l-2 border-[color:var(--line-strong)] pl-3 text-[14px] leading-[1.65] text-[color:var(--text-soft)]'
              key={`${index}-${paragraph.slice(0, 24)}`}
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
