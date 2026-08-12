import type { MarketSnapshot } from '@/lib/view-models';

/**
 * 내부 처리 정보. 상단에서 결론을 가리지 않도록 기본 접힘 상태로 둔다.
 */
export function PageDataDetails({ snapshot }: { snapshot: MarketSnapshot }) {
  const metadata = snapshot.metadata;

  return (
    <details className='rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] px-[18px] py-3'>
      <summary className='flex min-h-tap cursor-pointer items-center text-body font-semibold text-fg-soft'>
        데이터 정보
      </summary>
      <div className='mono flex flex-wrap gap-x-4.5 gap-y-2 pt-2 text-body-sm text-faint'>
        {metadata ? (
          <span className='whitespace-nowrap'>
            원문 {metadata.rawNewsCount}건 → 정제 {metadata.processedNewsCount}
            건 → 클러스터 {metadata.clusterCount}건
          </span>
        ) : null}
        <span className='whitespace-nowrap'>
          pageId {snapshot.pageId} · v{snapshot.versionNo}
        </span>
        {metadata?.lastUpdatedAt ? (
          <span className='whitespace-nowrap'>
            마지막 갱신 {metadata.lastUpdatedAt}
          </span>
        ) : null}
      </div>
    </details>
  );
}
