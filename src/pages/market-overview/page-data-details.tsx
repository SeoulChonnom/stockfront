import type { MarketSnapshot } from '@/lib/view-models';

/**
 * 내부 처리 정보. 상단에서 결론을 가리지 않도록 기본 접힘 상태로 둔다.
 *
 * 파이프라인 카운트(`원문 → 정제 → 클러스터`)와 `pageId`/`versionNo`는
 * 운영자 전용이다. PRODUCT.md "운영 로그와 원본 에러 메시지는 일반 사용자
 * 화면에 노출하지 않는다" — 접힘 상태라도 펼치면 보이므로 게이트가 필요하고,
 * 게이트는 이미 같은 화면의 다른 곳에서 쓰고 있던 것을 그대로 쓴다.
 *
 * 일반 사용자에게 남는 것은 "마지막 갱신"뿐이며, 그것마저 없으면 아무 것도
 * 없는 접힘 카드가 남으므로 컴포넌트 자체를 렌더링하지 않는다.
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

  if (!canViewOps && !lastUpdatedAt) {
    return null;
  }

  return (
    <details className='rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] px-[18px] py-3'>
      <summary className='flex min-h-tap cursor-pointer items-center text-body font-semibold text-fg-soft'>
        데이터 정보
      </summary>
      <div className='tnum flex flex-wrap gap-x-4.5 gap-y-2 pt-2 text-body-sm text-faint'>
        {canViewOps && metadata ? (
          <span className='whitespace-nowrap'>
            원문 {metadata.rawNewsCount}건 → 정제 {metadata.processedNewsCount}
            건 → 클러스터 {metadata.clusterCount}건
          </span>
        ) : null}
        {canViewOps ? (
          <span className='whitespace-nowrap'>
            pageId {snapshot.pageId} · v{snapshot.versionNo}
          </span>
        ) : null}
        {lastUpdatedAt ? (
          <span className='whitespace-nowrap'>마지막 갱신 {lastUpdatedAt}</span>
        ) : null}
      </div>
    </details>
  );
}
