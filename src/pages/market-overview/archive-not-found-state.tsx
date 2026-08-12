import { StatusCard } from '@/components/shell/status-card';
import { Button } from '@/components/ui/button';
import { createNavigateHandler } from '@/lib/app-state';
import { errorCodeCopy, marketNotFoundCopy } from '@/lib/audience-copy';
import { navigate, withBasePath } from '@/lib/router';

import { ArchiveModeBand } from './archive-mode-band';
import { getTodayBusinessDateKst, shiftBusinessDate } from './date-utils';
import { extractFilterQuery } from './navigation';

/**
 * Archive Detail 404는 해당 날짜 스냅샷이 없을 때 상태 화면을 보여준다.
 * 인접 날짜 이동 API가 없으므로(D-05) prev/next는
 * 여기서도 순수 날짜 산술이다 — 그래서 404 화면에서도 정상 스냅샷과 같은
 * `ArchiveModeBand`를 재사용해 날짜 내비게이션을 그대로 유지한다.
 *
 * `canViewOps`는 호출부(`market-overview-route-content.tsx`)가 이미 계산해
 * 둔 값을 그대로 받는다 — 이 컴포넌트에서 훅을 새로 호출하지 않는다.
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
  const prevDate = shiftBusinessDate(businessDate, -1);
  const nextDate = shiftBusinessDate(businessDate, 1);
  const nextDisabled = nextDate > getTodayBusinessDateKst();
  const filterQuery = extractFilterQuery(searchParams);

  return (
    <div className='flex flex-col gap-4 sm:gap-5'>
      <ArchiveModeBand
        businessDate={businessDate}
        filterQuery={filterQuery}
        nextDate={nextDate}
        nextDisabled={nextDisabled}
        pageId={null}
        prevDate={prevDate}
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
