import { Skeleton, SkeletonTableRows, SkeletonText } from '@/components/state';

/**
 * 최초 loading skeleton — README §8: "skeleton은 실제 레이아웃 골격을
 * 유지한다(중앙 메시지로 화면을 대체하지 않는다)". 결정 헤더 카드 + 시장
 * 비교 스트립 + 시장 섹션 하나 분량의 자리를 그대로 유지한다.
 */
export function MarketOverviewSkeleton({
  mode,
}: {
  mode: 'latest' | 'archive';
}) {
  return (
    <div aria-busy='true' className='flex flex-col gap-4 sm:gap-5'>
      {mode === 'archive' ? <Skeleton className='h-11 w-full' /> : null}
      <div className='flex flex-col gap-3.5 rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5'>
        <Skeleton className='h-4 w-52' />
        <Skeleton className='h-4 w-36' />
        <Skeleton className='h-7 w-3/4' />
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
          <Skeleton className='h-28 w-full' />
          <Skeleton className='h-28 w-full' />
        </div>
        <Skeleton className='h-4 w-2/3' />
      </div>
      <div className='flex flex-col gap-4 rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5'>
        <SkeletonText lines={4} />
        <SkeletonTableRows cols={6} rows={4} />
      </div>
      <p className='m-0 text-[13px] text-[color:var(--text-faint)]'>
        브리프를 불러오는 중입니다. 화면 구조는 그대로 유지됩니다.
      </p>
    </div>
  );
}
