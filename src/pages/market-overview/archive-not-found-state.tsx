import { StatusCard } from '@/components/shell/status-card';
import { Button } from '@/components/ui/button';
import { createNavigateHandler } from '@/lib/app-state';
import { errorCodeCopy, marketNotFoundCopy } from '@/lib/audience-copy';
import { navigate, withBasePath } from '@/lib/router';

import { ArchiveModeBand } from './archive-mode-band';
import { extractFilterQuery } from './navigation';
import { useAdjacentSnapshotDates } from './use-adjacent-snapshot-dates';

/**
 * Archive Detail 404는 해당 날짜 스냅샷이 없을 때 상태 화면을 보여준다.
 * 인접 날짜 이동 API가 없으므로(D-05) prev/next는 같은 `ArchiveModeBand`가
 * `useAdjacentSnapshotDates`로 ±90일 아카이브 목록을 조회해 실제 존재하는
 * 이웃 날짜만 활성화한다 — 이 화면은 이미 "스냅샷 없는 날짜"에 도착한
 * 상태이므로, prev/next가 순수 날짜 산술이면 다음 클릭이 곧바로 또 다른
 * 404로 이어지는 루프가 된다.
 *
 * `canViewOps`는 호출부(`market-overview-route-content.tsx`)가 이미 계산해
 * 둔 값을 그대로 받는다 — 이 컴포넌트에서 그 훅은 새로 호출하지 않는다.
 */
export function ArchiveNotFoundState({
  businessDate,
  canViewOps,
  searchParams,
}: {
  businessDate: string;
  canViewOps: boolean;
  searchParams: URLSearchParams;
}) {
  const audience = { canViewOps };
  const adjacent = useAdjacentSnapshotDates(businessDate);
  const filterQuery = extractFilterQuery(searchParams);

  return (
    <div className='flex flex-col gap-4 sm:gap-5'>
      <ArchiveModeBand
        businessDate={businessDate}
        filterQuery={filterQuery}
        nextDate={adjacent.next}
        pageId={null}
        prevDate={adjacent.previous}
        versionNo={null}
      />
      <StatusCard
        actions={
          <>
            <Button
              onClick={() => navigate('/market/archive/search')}
              type='button'
            >
              아카이브에서 찾기
            </Button>
            <Button asChild type='button' variant='secondary'>
              <a
                href={withBasePath('/market/latest')}
                onClick={createNavigateHandler('/market/latest')}
              >
                최신 브리프
              </a>
            </Button>
          </>
        }
        badge={errorCodeCopy(audience, '404 · PAGE_NOT_FOUND')}
        description={marketNotFoundCopy(audience)}
        fullScreen={false}
        role='alert'
        title='해당 날짜의 스냅샷이 없습니다'
        titleId='page-title'
        tone='danger'
      />
    </div>
  );
}
