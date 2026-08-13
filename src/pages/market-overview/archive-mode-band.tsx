import { Button } from '@/components/ui/button';
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
  const prevDate = adjacentDate(navigation, 'previous');
  const nextDate = adjacentDate(navigation, 'next');
  const prevDisabled = navigation.status !== 'ready' || prevDate === null;
  const nextDisabled = navigation.status !== 'ready' || nextDate === null;
  return (
    <div className='flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[var(--r-lg)] border border-[color:var(--warning-line)] border-l-4 border-l-[color:var(--warning)] bg-[color:var(--warning-soft)] px-4 py-3'>
      <span className='text-caption font-bold tracking-[0.07em] text-[color:var(--warning)] uppercase'>
        아카이브 스냅샷
      </span>
      <span className='mono text-[14px] font-semibold'>{businessDate}</span>
      {pageId !== null && versionNo !== null ? (
        <span className='mono text-[12px] text-fg-soft'>
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
          className='mono min-h-9 px-3 text-body-sm'
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
          className='mono min-h-9 px-3 text-body-sm'
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
