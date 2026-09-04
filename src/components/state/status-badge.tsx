import { ToneBadge } from '@/components/domain/tone-badge';
import type { SurfaceTone } from '@/components/state/tone-surface';
import { cn } from '@/lib/utils';

/** Renders a readable fallback for unknown backend statuses instead of dropping them. */

const STATUS_LABELS: Readonly<Record<string, string>> = {
  ready: '준비 완료',
  partial: '부분 생성',
  failed: '생성 실패',
  success: '성공',
  running: '실행 중',
  pending: '대기',
  skipped: '건너뜀',
};

const STATUS_TONES: Readonly<Record<string, SurfaceTone>> = {
  ready: 'success',
  success: 'success',
  partial: 'warning',
  failed: 'danger',
  running: 'info',
  pending: 'neutral',
  skipped: 'neutral',
};

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

function StatusDot({ spinner }: { spinner?: boolean }) {
  return (
    <span
      aria-hidden='true'
      className={cn(
        'size-1.5 shrink-0 rounded-full',
        spinner
          ? 'animate-spin border-[1.5px] border-current border-t-transparent bg-transparent'
          : 'bg-current'
      )}
    />
  );
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
    <ToneBadge className={className} size={size} tone={tone}>
      <StatusDot spinner={spinner} />
      {label}
    </ToneBadge>
  );
}

export function RefetchBadge({ className }: { className?: string }) {
  return (
    <ToneBadge className={className} tone='info'>
      <StatusDot spinner />
      갱신 중
    </ToneBadge>
  );
}
