import type { AriaRole, ReactNode } from 'react';
import {
  type SurfaceTone,
  TONE_ACCENT,
  TONE_SURFACE,
} from '@/components/state/tone-surface';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * `SurfaceTone`을 그대로 재노출하지 않고 4-멤버로 좁힌다 — `neutral`은
 * 배지 전용 톤이라, 좁히지 않으면 톤 테이블 통합만으로 `InlineAlert`의
 * 공개 계약이 조용히 넓어진다.
 */
type AlertTone = Exclude<SurfaceTone, 'neutral'>;

export type InlineAlertProps = {
  tone: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  role?: AriaRole;
  ariaLive?: 'off' | 'polite' | 'assertive';
  className?: string;
};

/**
 * `AlertTitle`은 `<div>`로 고정돼 있고 `asChild`도 없어 제목의 `h3` 시맨틱을
 * 넘겨줄 수 없다 — 이 컴포넌트가 뜨는 화면들의 heading outline이 그 h3에
 * 걸려 있으므로(예: `cluster-analysis.tsx`가 넘기는 title이 `getAllByRole('heading',
 * { level: 3 })`로 단언됨) 여기서는 `AlertTitle`을 쓰지 않고 원래의 `h3`를
 * 그대로 둔다 — 등록 컴포넌트 구조를 억지로 끼워 맞추기보다 축소 적용한다.
 *
 * `Alert`은 아이콘 슬롯을 전제한 `grid` 레이아웃(`grid-cols-[0_1fr]` 등)을
 * 기본값으로 갖는데, 이 컴포넌트의 `info` 톤은 아이콘이 아니라 텍스트
 * 글리프(`i`)를 쓰고 나머지 톤은 아이콘 슬롯 자체가 없다. `className`으로
 * `block`/`flex`를 얹어 grid를 걷어낸다 — `cn`이 tailwind-merge라 같은
 * 유틸리티 그룹(display·padding·radius 등)은 뒤에 온 값이 앞선 레지스트리
 * 기본값을 대체한다.
 */
export function InlineAlert({
  tone,
  title,
  children,
  actions,
  role,
  ariaLive,
  className,
}: InlineAlertProps) {
  const resolvedRole = role ?? (tone === 'danger' ? 'alert' : undefined);
  const isInfo = tone === 'info';

  const content = (
    <>
      {title ? (
        <h3
          className={cn(
            'm-0 mb-1 line-clamp-none min-h-0 tracking-normal',
            'text-card-heading font-semibold',
            TONE_ACCENT[tone]
          )}
        >
          {title}
        </h3>
      ) : null}
      {children ? (
        <AlertDescription
          className={cn(
            'block gap-0 p-0',
            'measure-error wrap-anywhere m-0 text-body text-fg-soft'
          )}
        >
          {children}
        </AlertDescription>
      ) : null}
      {actions ? (
        <div className='mt-3 flex flex-wrap gap-2'>{actions}</div>
      ) : null}
    </>
  );

  return (
    <Alert
      aria-live={ariaLive}
      className={cn(
        'block min-w-0 rounded-md border',
        isInfo ? 'flex items-stretch gap-2.5 py-3 px-4' : 'p-4',
        TONE_SURFACE[tone],
        className
      )}
      role={resolvedRole}
    >
      {isInfo ? (
        <span aria-hidden='true' className='shrink-0 font-bold text-info'>
          i
        </span>
      ) : null}
      {isInfo ? <div className='min-w-0'>{content}</div> : content}
    </Alert>
  );
}
