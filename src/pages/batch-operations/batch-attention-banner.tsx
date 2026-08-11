import { Button } from '@/components/ui/button';

export function BatchAttentionBanner({
  failedCount,
  partialCount,
  onFilterFailed,
  onFilterPartial,
}: {
  failedCount: number;
  partialCount: number;
  onFilterFailed: () => void;
  onFilterPartial: () => void;
}) {
  return (
    <div className='flex min-w-0 flex-wrap items-center gap-2.5 rounded-[var(--r-lg)] border border-[color:var(--danger-line)] border-l-4 border-l-[color:var(--danger)] bg-[color:var(--surface)] px-4 py-3'>
      <p className='wrap-anywhere m-0 text-body font-semibold text-fg'>
        {failedCount}건 실패, {partialCount}건 부분 실패 — 확인이 필요합니다.
      </p>
      {/* Keep banner actions at 36px rather than the default small-button
          height so the alert remains compact; font metrics are unchanged. */}
      <div className='ml-auto flex flex-wrap gap-2'>
        <Button
          className='min-h-9'
          onClick={onFilterFailed}
          size='sm'
          type='button'
          variant='ghost'
        >
          실패만 보기
        </Button>
        <Button
          className='min-h-9'
          onClick={onFilterPartial}
          size='sm'
          type='button'
          variant='ghost'
        >
          부분 실패만 보기
        </Button>
      </div>
    </div>
  );
}
