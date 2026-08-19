import {
  DirectionIndicator,
  directionTextClass,
  StatusBadge,
} from '@/components/state';
import {
  DescriptionList,
  DescriptionListItem,
} from '@/components/ui/description-list';
import type { MarketSnapshot } from '@/lib/view-models';

/**
 * 표기 안내 + 내부 처리 정보. 상단에서 결론을 가리지 않도록 기본 접힘이다.
 *
 * 파이프라인 카운트(`원문 → 정제 → 클러스터`)와 `pageId`/`versionNo`는
 * 운영자 전용이다. PRODUCT.md "운영 로그와 원본 에러 메시지는 일반 사용자
 * 화면에 노출하지 않는다" — 접힘 상태라도 펼치면 보이므로 게이트가 필요하고,
 * 게이트는 이미 같은 화면의 다른 곳에서 쓰고 있던 것을 그대로 쓴다.
 *
 * 표기 안내는 게이트가 없다. 이 화면이 쓰는 두 가지 규약 — 날짜가 왜 둘인지
 * (`businessDate` vs `generatedAt`), 그리고 **방향과 상태를 색이 아니라
 * 표기 방식으로 가른다**는 규칙 — 이 지금까지 코드 주석과 PRODUCT.md에만
 * 있었다. 화면 안에서 배울 방법이 없으면 규약은 없는 것과 같고, 특히 상승이
 * 빨강인 한국 관행과 위험을 뜻하는 빨강이 한 화면에 같이 있으므로 "이 빨강은
 * 어느 쪽인가"에 답이 있어야 한다.
 *
 * 설명하지 않고 **실물을 보여준다.** 범례가 진짜 `DirectionIndicator`와
 * 진짜 `StatusBadge`를 렌더링하므로, 토큰이나 글리프가 바뀌면 범례도 같이
 * 바뀐다 — 따로 관리되다 어긋나는 사본이 생기지 않는다.
 */
export function PageDataDetails({
  snapshot,
  canViewOps,
}: {
  snapshot: MarketSnapshot;
  canViewOps: boolean;
}) {
  const metadata = snapshot.metadata;
  const lastUpdatedAt = metadata?.lastUpdatedAt ?? null;
  const hasDataRow = canViewOps || Boolean(lastUpdatedAt);

  return (
    <details className='rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] px-[18px] py-3'>
      <summary className='flex min-h-tap cursor-pointer items-center text-body font-semibold text-fg-soft'>
        표기와 데이터 정보
      </summary>
      <div className='flex flex-col gap-3.5 pt-2.5'>
        <DescriptionList>
          <DescriptionListItem
            label='기준일'
            value='시장 결과가 속한 날짜입니다. 한국 시간(UTC+9)으로 셉니다.'
          />
          <DescriptionListItem
            label='생성'
            value='이 브리프가 만들어진 시각입니다. 기준일과 다를 수 있습니다.'
          />
          <DescriptionListItem
            label='방향'
            value={
              <>
                {/* 방향 단어는 `DirectionIndicator`가 이미 `.sr-only`로 읽어
                    주므로, 눈에 보이는 쪽은 `aria-hidden`으로 둔다. 그러지
                    않으면 스크린리더가 "상승 상승"으로 두 번 읽는다. */}
                <span className={directionTextClass('up')}>
                  <DirectionIndicator direction='up' />
                  <span aria-hidden='true'> 상승</span>
                </span>
                <span className='mx-1.5 text-faint'>·</span>
                <span className={directionTextClass('down')}>
                  <DirectionIndicator direction='down' />
                  <span aria-hidden='true'> 하락</span>
                </span>
                <span className='block text-fg-soft'>
                  지수의 등락입니다. 한국 관행대로 상승이 빨강, 하락이
                  파랑입니다.
                </span>
              </>
            }
          />
          <DescriptionListItem
            label='상태'
            value={
              <>
                {/* 견본이라고 밝힌다. 이 배지는 진짜 `StatusBadge`라서 이 페이지의
                    실제 상태 배지와 글자가 겹칠 수 있고, 표시가 없으면 여기 적힌
                    "부분 생성"을 오늘의 상태로 읽을 수 있다. */}
                <span className='mr-1.5 text-faint'>예:</span>
                <StatusBadge size='sm' status='partial' />
                <span className='block text-fg-soft'>
                  테두리가 있는 배지는 등락이 아니라 그날 브리프가 얼마나
                  만들어졌는지를 뜻합니다. 빨간 배지는 하락이 아니라 실패입니다.
                </span>
              </>
            }
          />
        </DescriptionList>

        {hasDataRow ? (
          <div className='tnum flex flex-wrap gap-x-4.5 gap-y-2 border-t border-line pt-3 text-body-sm text-faint'>
            {canViewOps && metadata ? (
              <span className='whitespace-nowrap'>
                원문 {metadata.rawNewsCount}건 → 정제{' '}
                {metadata.processedNewsCount}건 → 클러스터{' '}
                {metadata.clusterCount}건
              </span>
            ) : null}
            {canViewOps ? (
              <span className='whitespace-nowrap'>
                pageId {snapshot.pageId} · v{snapshot.versionNo}
              </span>
            ) : null}
            {lastUpdatedAt ? (
              <span className='whitespace-nowrap'>
                마지막 갱신 {lastUpdatedAt}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}
