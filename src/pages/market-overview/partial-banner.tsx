import { Button } from '@/components/ui/button';
import { navigate } from '@/lib/router';
import type { MarketSnapshot } from '@/lib/view-models';

/**
 * PARTIAL 배너 — README §7-2 item 2. `status==='partial'`이거나 페이지 레벨
 * `partialMessage`가 있으면 렌더링한다. 누락 항목은 페이지 레벨 메시지 +
 * 시장별 `metadata.partialMessage`를 `시장명 — 메시지`로 합친 목록이다.
 */

export function PartialBanner({
  snapshot,
  canViewOps,
}: {
  snapshot: MarketSnapshot;
  canViewOps: boolean;
}) {
  const shouldShow =
    snapshot.status === 'partial' || Boolean(snapshot.partialMessage);

  if (!shouldShow) {
    return null;
  }

  const items: string[] = [];

  if (snapshot.partialMessage) {
    items.push(snapshot.partialMessage);
  }

  snapshot.markets.forEach((market) => {
    if (market.metadata?.partialMessage) {
      items.push(`${market.label} — ${market.metadata.partialMessage}`);
    }
  });

  return (
    <section
      aria-labelledby='partial-banner-heading'
      className='rounded-[var(--r-lg)] border border-[color:var(--warning-line)] border-l-4 border-l-[color:var(--warning)] bg-[color:var(--surface)] px-[18px] py-4'
    >
      <h2
        className='m-0 mb-1.5 text-card-heading font-semibold'
        id='partial-banner-heading'
      >
        이 브리프는 일부 데이터가 누락된 상태로 생성됐습니다
      </h2>
      {items.length > 0 ? (
        <ul className='m-0 mb-3 flex list-disc flex-col gap-1 pl-[18px] text-[13px] text-fg-soft'>
          {items.map((text) => (
            <li className='wrap-anywhere' key={text}>
              {text}
            </li>
          ))}
        </ul>
      ) : null}
      <p className='m-0 mb-3 text-[13px] text-fg-soft'>
        누락된 항목은 아래 해당 섹션에도 표시됩니다. 재생성이 필요하면 배치
        운영에서 같은 기준일로 다시 실행할 수 있습니다.
      </p>
      {canViewOps ? (
        <Button
          onClick={() => navigate('/ops/batches')}
          type='button'
          variant='secondary'
        >
          배치 운영에서 원인 보기
        </Button>
      ) : null}
    </section>
  );
}
