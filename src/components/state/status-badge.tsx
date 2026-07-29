import { cn } from '@/lib/utils';

/**
 * StatusBadge — README §6 "상태 색 사용 규칙" + §12 (getStatusClass 대체).
 *
 * 상태 배지는 색만으로 의미를 전달하지 않는다: 5–6px 도트 + 한국어
 * 상태어를 항상 함께 렌더링한다. `status`는 백엔드 DTO의 원문 값이므로
 * 대소문자를 정규화해 매핑하고, 매핑에 없는 값은 던지거나 비우지 않고
 * neutral tone + 원문 문자열로 그대로 보여준다(알 수 없는 상태도 사용자가
 * 읽을 수 있어야 한다).
 */

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
  success:
    'text-[color:var(--success)] bg-[color:var(--success-soft)] border-[color:var(--success-line)]',
  warning:
    'text-[color:var(--warning)] bg-[color:var(--warning-soft)] border-[color:var(--warning-line)]',
  danger:
    'text-[color:var(--danger)] bg-[color:var(--danger-soft)] border-[color:var(--danger-line)]',
  info: 'text-[color:var(--info)] bg-[color:var(--info-soft)] border-[color:var(--info-line)]',
  neutral:
    'text-[color:var(--neutral)] bg-[color:var(--neutral-soft)] border-[color:var(--neutral-line)]',
};

const BADGE_BASE_CLASSES =
  'inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border px-2 py-0.5 text-[12.5px] font-semibold leading-[1.4] whitespace-nowrap';

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

export type StatusBadgeProps = {
  /** 백엔드 DTO의 원문 상태 값 (READY/PARTIAL/FAILED/SUCCESS/RUNNING/PENDING/SKIPPED 등). */
  status: string;
  /** RUNNING/refetching처럼 진행 중임을 스피너 도트로 보여줘야 할 때. */
  spinner?: boolean;
  className?: string;
};

export function StatusBadge({ status, spinner, className }: StatusBadgeProps) {
  const normalized = normalizeStatus(status);
  const label = STATUS_LABELS[normalized] ?? status;
  const tone = STATUS_TONES[normalized] ?? 'neutral';

  return (
    <span className={cn(BADGE_BASE_CLASSES, TONE_CLASSES[tone], className)}>
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

/**
 * Latest/Archive Search 헤더의 독립된 "갱신 중" 배지(README §7-2, §7-4).
 * refetch 중임을 알리는 용도이며 StatusBadge와 같은 tone 시스템을 쓴다.
 */
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
