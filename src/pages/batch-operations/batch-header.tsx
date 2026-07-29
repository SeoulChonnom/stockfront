import { Button } from '@/components/ui/button';

/**
 * README §7-6 point 1: h1 `배치 운영` (`id="page-title"`, focusable for
 * route-change focus per §7-1) + description + right-aligned `수동 실행`
 * primary button (`id="trigger-btn"` — the Trigger dialog returns focus
 * here on close via `Dialog`'s shared `useDismissable`, which remembers
 * whatever had focus when it opened).
 */
export function BatchHeader({ onOpenTrigger }: { onOpenTrigger: () => void }) {
  return (
    <header className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
      <div className='min-w-0'>
        <h1
          className='m-0 text-[22px] font-semibold text-[color:var(--text)]'
          id='page-title'
          tabIndex={-1}
        >
          배치 운영
        </h1>
        <p className='wrap-anywhere mt-1 max-w-[76ch] text-[13.5px] text-[color:var(--text-soft)]'>
          시장 브리프 배치 파이프라인의 실행 이력, 실패/부분 실패 현황을
          확인하고 수동으로 재실행을 요청합니다.
        </p>
      </div>
      <Button
        id='trigger-btn'
        onClick={onOpenTrigger}
        type='button'
        variant='primary'
      >
        수동 실행
      </Button>
    </header>
  );
}
