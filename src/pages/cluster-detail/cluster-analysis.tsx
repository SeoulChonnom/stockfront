/**
 * "AI 심층 분석" renders `summary.long` followed by each
 * `summary.analysis[]` paragraph with a left quote rule, all at one type
 * size, plus generation time and a link to the source articles.
 *
 * `summary.long` reaches this component as `analysisLead`, distinct from
 * `summary.short`, so the same sentence is not rendered twice.
 *
 * The backend cluster summary is only `{ short, long, analysis[] }` — there
 * is no structured section data, so 발생 배경/시장 영향/관련 업종·종목/향후
 * 관전 포인트 subheadings and sentence-level source citations are NOT
 * implemented here (that would require inferring sections by parsing
 * paragraph text, which risks mislabeling); tracked as B-2 in
 * `docs/backend-requests-2026-08-12.md`.
 */
export function ClusterAnalysis({
  analysis,
  analysisLead,
  generatedAt,
}: {
  analysis: string[];
  analysisLead: string | null;
  generatedAt: string | null;
}) {
  return (
    <section
      aria-labelledby='cluster-analysis-heading'
      className='min-w-0 rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] p-[18px]'
    >
      <div className='mb-3 flex flex-wrap items-center gap-x-3 gap-y-1'>
        <h2
          className='m-0 text-card-heading font-semibold text-fg'
          id='cluster-analysis-heading'
        >
          AI 심층 분석
        </h2>
        {generatedAt ? (
          <span className='mono text-body-sm text-faint'>
            생성 기준 {generatedAt}
          </span>
        ) : null}
        <a
          className='ms-auto inline-flex min-h-tap items-center text-body-sm text-fg-soft underline underline-offset-2'
          href='#cluster-articles-heading'
        >
          근거 기사 보기
        </a>
      </div>

      {analysisLead ? (
        <p className='measure-analysis wrap-anywhere m-0 mb-3 text-body text-fg'>
          {analysisLead}
        </p>
      ) : null}

      {analysis.length === 0 ? (
        <p className='measure-analysis wrap-anywhere m-0 text-body text-fg-soft'>
          이 이슈의 심층 분석이 아직 생성되지 않았습니다. AI 요약 단계가
          완료되면 이 영역에 표시됩니다.
        </p>
      ) : (
        <div className='flex flex-col gap-4'>
          {/* `analysis` is a read-only paragraph list replaced wholesale on
              each fetch. Two paragraphs can share the same opening 24 chars, so
              the index is what keeps keys unique; the <p> holds no state. */}
          {analysis.map((paragraph, index) => (
            <p
              className='measure-analysis wrap-anywhere m-0 border-l-2 border-[color:var(--line-strong)] pl-3 text-body leading-[1.65] text-fg-soft'
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
