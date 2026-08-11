import type { MarketAnalysis } from '@/lib/view-models';

/**
 * 분석 2열 — "배경(불릿) / 핵심 테마(칩) + 관전 포인트".
 * 세 항목 모두 비어 있으면 아무것도 렌더링하지 않는다.
 */
export function MarketAnalysisBlock({
  analysis,
}: {
  analysis: MarketAnalysis | undefined;
}) {
  const background = analysis?.background ?? [];
  const keyThemes = analysis?.keyThemes ?? [];
  const outlook = analysis?.outlook;

  if (background.length === 0 && keyThemes.length === 0 && !outlook) {
    return null;
  }

  return (
    <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
      {background.length > 0 ? (
        <div className='min-w-0'>
          <div className='mb-1.5 text-label font-semibold tracking-[0.07em] text-faint uppercase'>
            배경
          </div>
          <ul className='m-0 flex list-disc flex-col gap-0.5 pl-4 text-body text-fg-soft'>
            {background.map((line) => (
              <li className='wrap-anywhere' key={line}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className='flex min-w-0 flex-col gap-3'>
        {keyThemes.length > 0 ? (
          <div>
            <div className='mb-1.5 text-label font-semibold tracking-[0.07em] text-faint uppercase'>
              핵심 테마
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {keyThemes.map((theme) => (
                <span
                  className='rounded-[var(--r-sm)] border border-line bg-[color:var(--surface-2)] px-[9px] py-[3px] text-body-sm text-fg-soft'
                  key={theme}
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {outlook ? (
          <div>
            <div className='mb-1.5 text-label font-semibold tracking-[0.07em] text-faint uppercase'>
              관전 포인트
            </div>
            <p className='text-pretty wrap-anywhere m-0 text-body text-fg-soft'>
              {outlook}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
