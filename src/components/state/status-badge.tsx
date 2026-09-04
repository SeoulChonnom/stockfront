import { cn } from '@/lib/utils';

/** Renders a readable fallback for unknown backend statuses instead of dropping them. */

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const STATUS_LABELS: Readonly<Record<string, string>> = {
  ready: '준비 완료',
  partial: '부분 생성',
  failed: '생성 실패',
  success: '성공',
  running: '실행 중',
  pending: '대기',
  skipped: '건너뜀',
};

const STATUS_TONES: Readonly<Record<string, BadgeTone>> = {
  ready: 'success',
  success: 'success',
  partial: 'warning',
  failed: 'danger',
  running: 'info',
  pending: 'neutral',
  skipped: 'neutral',
};

const TONE_CLASSES: Readonly<Record<BadgeTone, string>> = {
  success: 'text-success bg-success-soft border-success-line',
  warning: 'text-warning bg-warning-soft border-warning-line',
  danger: 'text-danger bg-danger-soft border-danger-line',
  info: 'text-info bg-info-soft border-info-line',
  neutral: 'text-neutral bg-neutral-soft border-neutral-line',
};

const BADGE_BASE_CLASSES =
  'inline-flex items-center gap-1.5 rounded-sm border px-[9px] py-1 text-label font-semibold whitespace-nowrap';

const BADGE_SM_CLASSES = 'gap-[5px] px-2 py-[3px] text-body-sm';

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

export type StatusBadgeProps = {
  status: string;
  spinner?: boolean;
  className?: string;
  size?: 'default' | 'sm';
};

export function StatusBadge({
  status,
  spinner,
  className,
  size = 'default',
}: StatusBadgeProps) {
  const normalized = normalizeStatus(status);
  const label = STATUS_LABELS[normalized] ?? status;
  const tone = STATUS_TONES[normalized] ?? 'neutral';

  return (
    <span
      className={cn(
        BADGE_BASE_CLASSES,
        size === 'sm' && BADGE_SM_CLASSES,
        TONE_CLASSES[tone],
        className
      )}
    >
      <span
        aria-hidden='true'
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          spinner
            ? 'animate-spin border-[1.5px] border-current border-t-transparent bg-transparent'
            : 'bg-current'
        )}
      />
      {label}
    </span>
  );
}

export function RefetchBadge({ className }: { className?: string }) {
  return (
    <span className={cn(BADGE_BASE_CLASSES, TONE_CLASSES.info, className)}>
      <span
        aria-hidden='true'
        className='size-1.5 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent bg-transparent'
      />
      갱신 중
    </span>
  );
}
