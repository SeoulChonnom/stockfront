import { StatusCard } from '@/components/shell/status-card';
import { Button } from '@/components/ui/button';
import { createNavigateHandler } from '@/lib/app-state';
import { errorCodeCopy, marketNotFoundCopy } from '@/lib/audience-copy';
import { navigate, withBasePath } from '@/lib/router';

import { ArchiveModeBand } from './archive-mode-band';
import { extractFilterQuery } from './navigation';
import { useAdjacentNavigation } from './use-adjacent-navigation';

/**
 * Archive Detail 404는 해당 날짜 스냅샷이 없을 때 상태 화면을 보여준다.
 * 이 화면에는 로드된 일간 페이지 응답이 없으므로(요청 자체가 404였다),
 * `ArchiveModeBand`의 prev/next는 표준 `GET /pages/navigation` 엔드포인트
 * (B-5)를 직접 호출하는 `useAdjacentNavigation`으로 구한다 — 페이지 응답이
 * 있는 화면은 그 응답의 `navigation`을 재사용해야 하고(중복 요청 방지),
 * 이 화면이 바로 그 예외(A-6 "어느 경로를 쓸 것인가")다. 서버가 실제로
 * 존재하는 이웃 날짜만 내려주므로, 다음 클릭이 곧바로 또 다른 404로
 * 이어지는 루프가 되지 않는다.
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
  const navigation = useAdjacentNavigation(businessDate);
  const filterQuery = extractFilterQuery(searchParams);

  return (
    <div className='flex flex-col gap-4 sm:gap-5'>
      <ArchiveModeBand
        businessDate={businessDate}
        filterQuery={filterQuery}
        navigation={navigation}
        pageId={null}
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
