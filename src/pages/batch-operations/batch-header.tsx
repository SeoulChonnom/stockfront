import { Button } from '@/components/ui/button';

export function BatchHeader({ onOpenTrigger }: { onOpenTrigger: () => void }) {
  return (
    <header className='flex flex-wrap items-end gap-3'>
      <div className='min-w-0 flex-1'>
        <h1
          className='m-0 mb-1 text-[22px] font-semibold text-[color:var(--text)]'
          id='page-title'
          tabIndex={-1}
        >
          배치 운영
        </h1>
        <p className='wrap-anywhere mt-1 max-w-[70ch] text-[13.5px] text-[color:var(--text-soft)]'>
          검색 결과 저장과 스냅샷 생성 배치는 각각 독립적으로 실행됩니다.
          기간·상태·타입으로 이력을 조회하고 단계별 진행, 실패 지점, 영향 범위를
          확인합니다.
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
