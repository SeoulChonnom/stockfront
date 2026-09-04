import { ToneBadge } from '@/components/domain/tone-badge';
import { getBatchTypeInfo } from '@/lib/batch-type';

export type BatchTypeBadgeProps = {
  jobType: string;
  className?: string;
};

export function BatchTypeBadge({ jobType, className }: BatchTypeBadgeProps) {
  const { label, tone } = getBatchTypeInfo(jobType);

  return (
    <ToneBadge className={className} size='sm' tone={tone}>
      {label}
    </ToneBadge>
  );
}
