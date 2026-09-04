import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import {
  type SurfaceTone,
  TONE_ACCENT,
  TONE_SURFACE,
} from '@/components/state/tone-surface';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * 레지스트리 `Badge` 기본값은 알약(`rounded-full`) + `text-xs` + `gap-1`
 * `px-2 py-0.5`다. 이 앱 배지 5곳은 전부 각진 사각(`rounded-sm`)에 역할
 * 크기(`text-label`/`text-body-sm`)를 쓰므로, 여기서 그 기본값을 다시
 * 덮는다. `size`는 흩어져 있던 배지들이 실제로 쓰던 세 기하 그대로다.
 */
const toneBadgeVariants = cva(
  'gap-1.5 whitespace-nowrap rounded-sm border font-semibold',
  {
    variants: {
      size: {
        default: 'px-[9px] py-1 text-label',
        sm: 'gap-[5px] px-2 py-[3px] text-body-sm',
        compact: 'px-2 py-0.5 text-body-sm',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

/** 외부에서 이름으로 import하는 곳이 없어 비export로 둔다 — `ToneBadgeProps`만 공개 표면이면 충분하다. */
type ToneBadgeSize = VariantProps<typeof toneBadgeVariants>['size'];

export type ToneBadgeProps = {
  tone: SurfaceTone;
  size?: ToneBadgeSize;
} & Omit<React.ComponentProps<typeof Badge>, 'variant'>;

/**
 * 레지스트리 variant 중 `outline`만 `border-border text-foreground`라
 * 톤 클래스로 덮어쓸 여지가 있다(다른 variant는 배경·글자색이 고정
 * 클래스로 박혀 있어 톤을 얹을 수 없다). tailwind-merge가 뒤에 오는
 * `border-X-line`/`text-X`를 같은 색 그룹으로 인식해 `border-border`/
 * `text-foreground`를 밀어낸다 — 실제로 밀리는지 vitest로 확인했다.
 */
export function ToneBadge({ tone, size, className, ...props }: ToneBadgeProps) {
  return (
    <Badge
      className={cn(
        toneBadgeVariants({ size }),
        TONE_SURFACE[tone],
        TONE_ACCENT[tone],
        className
      )}
      variant='outline'
      {...props}
    />
  );
}
