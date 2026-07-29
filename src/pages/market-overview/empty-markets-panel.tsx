import { Button } from '@/components/ui/button';
import { navigate } from '@/lib/router';
import type { MarketSnapshot } from '@/lib/view-models';

/**
 * `markets:[]` 상태 — README §7-2 item 4.
 */
export function EmptyMarketsPanel({
  status,
  canViewOps,
}: {
  status: MarketSnapshot['status'];
  canViewOps: boolean;
}) {
  const reason =
    status === 'failed'
      ? '이 날짜의 배치가 뉴스 수집 단계에서 실패해 시장 섹션이 생성되지 않았습니다.'
      : '배치는 완료됐지만 시장 섹션이 비어 있습니다. 수집 결과가 0건이었을 수 있습니다.';

  return (
    <section
      aria-labelledby='empty-markets-heading'
      className='rounded-[var(--r-lg)] border border-dashed border-[color:var(--line-strong)] bg-[color:var(--surface)] p-6'
    >
      <h2
        className='m-0 mb-2 text-[16px] font-semibold'
        id='empty-markets-heading'
      >
        시장 섹션이 생성되지 않았습니다
      </h2>
      <p className='measure-analysis wrap-anywhere m-0 mb-4 text-[13.5px] text-[color:var(--text-soft)]'>
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
