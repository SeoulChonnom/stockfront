import { BATCH_TYPE_TONE_CLASSES, getBatchTypeInfo } from '@/lib/batch-type';
import { cn } from '@/lib/utils';

/**
 * `/ops/batches` 배치 타입 배지 — README §7-6/§7-7. `StatusBadge`(같은 폴더
 * 아님, `@/components/state/status-badge.tsx`)와 톤 팔레트는 공유하지만
 * 상태 도트가 없다 — 디자인의 타입 배지 마크업(`Market Brief v2.dc.html`
 * 894/863/859행)에는 도트가 없다.
 *
 * 헤더(job 상세)/테이블 셀/좁은 화면 접힘 배지 세 곳에서 padding이 각각
 * 3px 8px, 2px 8px, 2px 7px로 미세하게 다르지만(디자인 참조), 이 화면의
 * 5번째 컬럼 자체가 이번 pass에서 처음 생기는 것이라 픽셀 단위 정합은
 * 후속 pixel-perfect 패스가 담당한다(태스크 지시) — 여기서는 `className`
 * override로 호출부가 필요한 만큼만 조정한다.
 */
export type BatchTypeBadgeProps = {
  /** `BatchJobType` 원본 문자열. 알려지지 않은 값도 원문 그대로 표시한다. */
  jobType: string;
  className?: string;
};

export function BatchTypeBadge({ jobType, className }: BatchTypeBadgeProps) {
  const { label, tone } = getBatchTypeInfo(jobType);

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-[var(--r-sm)] border px-2 py-[3px] text-[11.5px] font-semibold whitespace-nowrap',
        BATCH_TYPE_TONE_CLASSES[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
