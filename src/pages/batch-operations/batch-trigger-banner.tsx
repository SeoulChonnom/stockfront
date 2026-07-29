import { StatusBadge } from '@/components/state';
import { Button } from '@/components/ui/button';
import { formatKstDateTime } from '@/lib/formatters';

/**
 * README §7-6 point 2: the persistent success banner left on the list page
 * after a Manual Trigger succeeds (§7-7 "닫으면 목록 상단에 성공 배너가
 * 남고"). Lives above the master-detail grid regardless of `view=detail`
 * drill-in, and is dismissed manually rather than timed out (state changes
 * shouldn't vanish under a screen-reader user before they notice it).
 */

export type TriggerBannerState = {
  jobId: number;
  status: string;
  businessDate: string;
  startedAt: string;
};

export function BatchTriggerBanner({
  banner,
  onOpenDetail,
  onDismiss,
}: {
  banner: TriggerBannerState;
  onOpenDetail: (jobId: number) => void;
  onDismiss: () => void;
}) {
  const startedAtDisplay =
    formatKstDateTime(banner.startedAt) ?? banner.startedAt;

  return (
    <div className='flex min-w-0 flex-wrap items-center gap-3 rounded-[var(--r-lg)] border border-[color:var(--success-line)] bg-[color:var(--success-soft)] p-4 shadow-[inset_3px_0_0_var(--success)]'>
      <div className='min-w-0 flex-1'>
        <p className='wrap-anywhere m-0 text-[13.5px] font-semibold text-[color:var(--success)]'>
          실행을 시작했습니다
        </p>
        <p className='wrap-anywhere m-0 mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-[color:var(--text-soft)]'>
          <span className='mono font-semibold text-[color:var(--text)]'>
            job {banner.jobId}
          </span>
          <StatusBadge status={banner.status} />
          <span className='mono'>
            기준일 {banner.businessDate} · 시작 {startedAtDisplay}
          </span>
        </p>
      </div>
      <div className='flex shrink-0 gap-2'>
        <Button
          onClick={() => onOpenDetail(banner.jobId)}
          size='sm'
          type='button'
          variant='ghost'
        >
          작업 보기
        </Button>
        <Button
          aria-label='배너 닫기'
          onClick={onDismiss}
          size='sm'
          type='button'
          variant='ghost'
        >
          닫기
        </Button>
      </div>
    </div>
  );
}
