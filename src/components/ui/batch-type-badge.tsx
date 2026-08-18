import { BATCH_TYPE_TONE_CLASSES, getBatchTypeInfo } from '@/lib/batch-type';
import { cn } from '@/lib/utils';

export type BatchTypeBadgeProps = {
  jobType: string;
  className?: string;
};

export function BatchTypeBadge({ jobType, className }: BatchTypeBadgeProps) {
  const { label, tone } = getBatchTypeInfo(jobType);

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-[var(--r-sm)] border px-2 py-[3px] text-body-sm font-semibold whitespace-nowrap',
        BATCH_TYPE_TONE_CLASSES[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
