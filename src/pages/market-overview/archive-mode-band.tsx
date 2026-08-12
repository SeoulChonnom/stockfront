import { Button } from '@/components/ui/button';
import { navigate } from '@/lib/router';

import { buildArchiveSearchHref, type FilterQueryParams } from './navigation';

/**
 * 아카이브 모드 밴드. Archive Detail만 Latest 위에 얹는 상단 밴드. 정상
 * 스냅샷과 인접 날짜 스냅샷이 없는 404 양쪽
 * 화면에서 재사용한다 — 두 경우 모두 날짜 내비게이션은 그대로 필요하다.
 *
 * `prevDate`/`nextDate`는 실제로 스냅샷이 존재하는 날짜만 담는다 — `null`이면
 * 그 방향에 인접 스냅샷이 없다는 뜻이고(로딩 중이거나 조회가 실패한 경우도
 * 포함), 버튼은 `disabled`로 렌더링되며 라벨도 이유를 그대로 말한다.
 */
export type ArchiveModeBandProps = {
  businessDate: string;
  pageId: number | null;
  versionNo: number | null;
  filterQuery: FilterQueryParams | null;
  prevDate: string | null;
  nextDate: string | null;
};

export function ArchiveModeBand({
  businessDate,
  pageId,
  versionNo,
  filterQuery,
  prevDate,
  nextDate,
}: ArchiveModeBandProps) {
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
          disabled={prevDate === null}
          onClick={() => {
            if (prevDate) {
              navigate(`/market/archive/${prevDate}`);
            }
          }}
          size='sm'
          type='button'
          variant='secondary'
        >
          {prevDate ? `이전 ${prevDate}` : '이전 브리프 없음'}
        </Button>
        <Button
          className='mono min-h-9 px-3 text-body-sm'
          disabled={nextDate === null}
          onClick={() => {
            if (nextDate) {
              navigate(`/market/archive/${nextDate}`);
            }
          }}
          size='sm'
          type='button'
          variant='secondary'
        >
          {nextDate ? `다음 ${nextDate}` : '다음 브리프 없음'}
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
