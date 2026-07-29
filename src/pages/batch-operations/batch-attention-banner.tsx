import { Button } from '@/components/ui/button';

/**
 * README §7-6 point 3: shown only when `failedCount + partialCount > 0`.
 * The two quick-filter buttons set the status query and reset to `page=1`
 * (§7-6: "status 쿼리 설정, page=1") rather than opening a separate filter
 * form.
 */
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
    <div className='flex min-w-0 flex-wrap items-center gap-3 rounded-[var(--r-lg)] border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] p-4 shadow-[inset_3px_0_0_var(--danger)]'>
      <p className='wrap-anywhere m-0 flex-1 text-[13.5px] font-semibold text-[color:var(--danger)]'>
        {failedCount}건 실패, {partialCount}건 부분 실패 — 확인이 필요합니다.
      </p>
      <div className='flex shrink-0 flex-wrap gap-2'>
        <Button
          onClick={onFilterFailed}
          size='sm'
          type='button'
          variant='ghost'
        >
          실패만 보기
        </Button>
        <Button
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
