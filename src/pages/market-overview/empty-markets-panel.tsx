import { Button } from '@/components/ui/button';
import { emptyMarketsReasonCopy } from '@/lib/audience-copy';
import { navigate } from '@/lib/router';
import type { MarketSnapshot } from '@/lib/view-models';

/**
 * `markets:[]` empty state.
 */
export function EmptyMarketsPanel({
  status,
  canViewOps,
}: {
  status: MarketSnapshot['status'];
  canViewOps: boolean;
}) {
  const reason = emptyMarketsReasonCopy({ canViewOps }, status);

  return (
    <section
      aria-labelledby='empty-markets-heading'
      className='rounded-[var(--r-lg)] border border-dashed border-[color:var(--line-strong)] bg-[color:var(--surface)] px-[22px] py-7'
    >
      <h2
        className='m-0 mb-2 text-card-heading font-semibold'
        id='empty-markets-heading'
      >
        시장 섹션이 생성되지 않았습니다
      </h2>
      <p className='measure-analysis wrap-anywhere m-0 mb-4 text-body text-fg-soft'>
        {reason}
      </p>
      <div className='flex flex-wrap gap-2'>
        {canViewOps ? (
          <Button onClick={() => navigate('/ops/batches')} type='button'>
            배치 상태 확인
          </Button>
        ) : null}
        <Button
          onClick={() => navigate('/market/archive/search')}
          type='button'
          variant='secondary'
        >
          다른 날짜 찾기
        </Button>
      </div>
    </section>
  );
}
