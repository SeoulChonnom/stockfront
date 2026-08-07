import { Button } from '@/components/ui/button';
import { navigate } from '@/lib/router';

import { buildArchiveSearchHref, type FilterQueryParams } from './navigation';

/**
 * 아카이브 모드 밴드 — README §7-3. Archive Detail만 Latest 위에 얹는 상단
 * 밴드. 정상 스냅샷(§7-3)과 404(§13 D-05, 인접 날짜 스냅샷이 없는 경우) 양쪽
 * 화면에서 재사용한다 — 두 경우 모두 날짜 산술 내비게이션은 그대로 필요하다.
 */
export type ArchiveModeBandProps = {
  businessDate: string;
  pageId: number | null;
  versionNo: number | null;
  filterQuery: FilterQueryParams | null;
  prevDate: string;
  nextDate: string;
  nextDisabled: boolean;
};

export function ArchiveModeBand({
  businessDate,
  pageId,
  versionNo,
  filterQuery,
  prevDate,
  nextDate,
  nextDisabled,
}: ArchiveModeBandProps) {
  return (
    <div className='flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[var(--r-lg)] border border-[color:var(--warning-line)] border-l-4 border-l-[color:var(--warning)] bg-[color:var(--warning-soft)] px-4 py-3'>
      <span className='text-[11.5px] font-bold tracking-[0.07em] text-[color:var(--warning)] uppercase'>
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
            className='min-h-9 px-3 text-[12.5px]'
            onClick={() => navigate(buildArchiveSearchHref(filterQuery))}
            size='sm'
            type='button'
            variant='secondary'
          >
            검색 결과로 돌아가기
          </Button>
        ) : null}
        <Button
          className='mono min-h-9 px-3 text-[12.5px]'
          onClick={() => navigate(`/market/archive/${prevDate}`)}
          size='sm'
          type='button'
          variant='secondary'
        >
          ← {prevDate}
        </Button>
        <Button
          className='mono min-h-9 px-3 text-[12.5px]'
          disabled={nextDisabled}
          onClick={() => navigate(`/market/archive/${nextDate}`)}
          size='sm'
          type='button'
          variant='secondary'
        >
          {nextDate} →
        </Button>
        <Button
          className='min-h-9 px-3 text-[12.5px]'
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
