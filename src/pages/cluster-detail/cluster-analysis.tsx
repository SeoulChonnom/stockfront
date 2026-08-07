/**
 * README §7-5 "AI 심층 분석" — spec calls for `summary.long`(14px) followed
 * by each `summary.analysis[]` paragraph with a left quote rule.
 *
 * `summary.long` reaches this component as `analysisLead`, distinct from
 * `summary.short`, so the same sentence is not rendered twice.
 */
export function ClusterAnalysis({
  analysis,
  analysisLead,
}: {
  analysis: string[];
  analysisLead: string | null;
}) {
  return (
    <section
      aria-labelledby='cluster-analysis-heading'
      className='min-w-0 rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] p-[18px]'
    >
      {/* Keep this card heading at 15px with its own margin; no icon is rendered. */}
      <h2
        className='m-0 mb-3 text-[15px] font-semibold text-fg'
        id='cluster-analysis-heading'
      >
        AI 심층 분석
      </h2>

      {analysisLead ? (
        <p className='measure-analysis wrap-anywhere m-0 mb-3 text-[14px] text-fg'>
          {analysisLead}
        </p>
      ) : null}

      {analysis.length === 0 ? (
        <p className='measure-analysis wrap-anywhere m-0 text-[13.5px] text-fg-soft'>
          이 이슈의 심층 분석이 아직 생성되지 않았습니다. AI 요약 단계가
          완료되면 이 영역에 표시됩니다.
        </p>
      ) : (
        <div className='flex flex-col gap-2.5'>
          {/* `analysis` is a read-only paragraph list replaced wholesale on
              each fetch. Two paragraphs can share the same opening 24 chars, so
              the index is what keeps keys unique; the <p> holds no state. */}
          {analysis.map((paragraph, index) => (
            <p
              className='measure-analysis wrap-anywhere m-0 border-l-2 border-[color:var(--line-strong)] pl-3 text-[13.5px] leading-[1.65] text-fg-soft'
              // biome-ignore lint/suspicious/noArrayIndexKey: stateless read-only list, index disambiguates equal prefixes — see above
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
