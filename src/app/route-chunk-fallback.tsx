import { Skeleton } from '@/components/state';

/**
 * 지연 로드된 라우트 청크를 기다리는 동안의 자리.
 *
 * 이 앱의 로딩 표기 규약을 그대로 따른다 — 시각적 자리는 `aria-hidden`
 * 스켈레톤이 잡고, 진행 상태는 보조기술이 읽을 수 있는 문장이 전한다
 * (`market-overview-skeleton.tsx`와 같은 구조). 스켈레톤만 두면
 * `prefers-reduced-motion`에서 시머가 정지 프레임으로 얼어붙어 아무 것도
 * 진행되지 않는 것처럼 보인다.
 *
 * 카드 하나 크기로 절제한다. 라우트별 실제 레이아웃을 흉내 내면 청크가
 * 도착하는 순간 어긋난 자리에서 실제 화면으로 갈아끼워져 오히려 더 크게
 * 흔들린다.
 */
export function RouteChunkFallback() {
  return (
    <div aria-busy='true' className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] px-[18px] py-4'>
        <Skeleton className='h-6 w-1/3' />
        <Skeleton className='h-4 w-2/3' />
        <Skeleton className='h-4 w-1/2' />
      </div>
      <p className='m-0 text-body-sm text-faint'>화면을 불러오는 중입니다.</p>
    </div>
  );
}
