import { TONE_SURFACE } from '@/components/state/tone-surface';
import { Button } from '@/components/ui/button';
import { useCapabilities } from '@/lib/capabilities';
import { navigate } from '@/lib/router';

import { buildArchiveSearchHref, type FilterQueryParams } from './navigation';
import type { AdjacentNavigationState } from './use-adjacent-navigation';

/**
 * 아카이브 모드 밴드. Archive Detail만 Latest 위에 얹는 상단 밴드. 정상
 * 스냅샷과 인접 날짜 스냅샷이 없는 404 양쪽
 * 화면에서 재사용한다 — 두 경우 모두 날짜 내비게이션은 그대로 필요하다.
 *
 * `navigation`이 `'ready'`일 때만 실제 날짜를 쓴다 — `null`은 "그 방향에
 * 인접 스냅샷이 없음"(그 버튼 하나만 비활성화)이고, `'loading'`/`'error'`는
 * "아직 모름"(양쪽 버튼 모두 비활성화, 추측하지 않음)이다. B-5 계약
 * (`docs/backend-requests-2026-08-12.md#A-6`)의 구분을 그대로 따른다.
 */
export type ArchiveModeBandProps = {
  businessDate: string;
  pageId: number | null;
  versionNo: number | null;
  filterQuery: FilterQueryParams | null;
  navigation: AdjacentNavigationState;
};

function adjacentDate(
  navigation: AdjacentNavigationState,
  direction: 'previous' | 'next'
): string | null {
  if (navigation.status !== 'ready') {
    return null;
  }

  return direction === 'previous'
    ? navigation.previousBusinessDate
    : navigation.nextBusinessDate;
}

function adjacentLabel(
  navigation: AdjacentNavigationState,
  direction: '이전' | '다음',
  date: string | null
): string {
  if (navigation.status === 'loading') {
    return `${direction} 확인 중`;
  }

  if (navigation.status === 'error') {
    return `${direction} 확인 불가`;
  }

  return date ? `${direction} ${date}` : `${direction} 브리프 없음`;
}

export function ArchiveModeBand({
  businessDate,
  pageId,
  versionNo,
  filterQuery,
  navigation,
}: ArchiveModeBandProps) {
  const { can } = useCapabilities();
  const canViewOps = can('ops.view');
  const prevDate = adjacentDate(navigation, 'previous');
  const nextDate = adjacentDate(navigation, 'next');
  const prevDisabled = navigation.status !== 'ready' || prevDate === null;
  const nextDisabled = navigation.status !== 'ready' || nextDate === null;
  return (
    <div
      // 이 밴드는 경고가 아니라 **모드 표시**다 — "지금 보는 것은 과거
      // 스냅샷"이라는 사실과 날짜 이동 수단을 담는다. 예전에는 호박색이라
      // 같은 화면에 함께 뜨는 `PartialBanner`(진짜 데이터 누락 경고)와
      // 색·모양이 겹쳤고, 그러면 "과거를 보는 중"과 "데이터가 빠졌다"가
      // 한 신호로 읽힌다. PRODUCT.md에서 아카이브는 예외 상태가 아니라
      // 정식 모드이므로 경고색을 쓸 이유도 없다.
      className={`flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[var(--r-lg)] border px-4 py-3 ${TONE_SURFACE.info}`}
    >
      <span className='text-body-sm font-bold tracking-caps text-[color:var(--info)] uppercase'>
        아카이브 스냅샷
      </span>
      <span className='tnum text-body font-semibold'>{businessDate}</span>
      {canViewOps && pageId !== null && versionNo !== null ? (
        <span className='tnum text-label text-fg-soft'>
          pageId {pageId} · v{versionNo}
        </span>
      ) : null}
      <div className='ml-auto flex flex-wrap gap-2'>
        {filterQuery ? (
          <Button
            className='min-h-9 px-3 text-body-sm'
            onClick={() => navigate(buildArchiveSearchHref(filterQuery))}
            size='sm'
            type='button'
            variant='secondary'
          >
            검색 결과로 돌아가기
          </Button>
        ) : null}
        <Button
          className='tnum min-h-9 px-3 text-body-sm'
          disabled={prevDisabled}
          onClick={() => {
            if (prevDate) {
              navigate(`/market/archive/${prevDate}`);
            }
          }}
          size='sm'
          type='button'
          variant='secondary'
        >
          {adjacentLabel(navigation, '이전', prevDate)}
        </Button>
        <Button
          className='tnum min-h-9 px-3 text-body-sm'
          disabled={nextDisabled}
          onClick={() => {
            if (nextDate) {
              navigate(`/market/archive/${nextDate}`);
            }
          }}
          size='sm'
          type='button'
          variant='secondary'
        >
          {adjacentLabel(navigation, '다음', nextDate)}
        </Button>
        <Button
          className='min-h-9 px-3 text-body-sm'
          onClick={() => navigate('/market/latest')}
          size='sm'
          type='button'
        >
          최신 브리프
        </Button>
      </div>
    </div>
  );
}
