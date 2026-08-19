import { Loader2 } from 'lucide-react';
import type { AriaRole, ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * 상태 카드. **`fullScreen`이 레이아웃 문법을 가른다.**
 *
 * `true`는 셸이 없는 전체 화면 상태다(인증 부트스트랩, 루트 에러 바운더리).
 * 화면에 이것 말고 아무것도 없으므로 440px 중앙 정렬이 맞다.
 *
 * `false`는 앱 셸 `<main>` 안에 들어가는 인페이지 상태다(404, 브리프 로드
 * 실패, 아카이브 날짜 없음). 예전에는 이때도 `mx-auto max-w-[440px]
 * text-center`를 그대로 써서, 같은 화면의 다른 모든 메시지(`PartialBanner`,
 * `InlineAlert`, 시장 섹션의 누락 안내)가 왼쪽 정렬 인라인 배너인데 이것만
 * 가운데 뜬 좁은 카드였다. 페이지 안의 메시지가 이웃과 다른 언어를 쓰면
 * 그 자리만 다른 제품에서 가져온 것처럼 읽힌다.
 *
 * 이제 인페이지는 카드 폭을 다 쓰고 왼쪽 정렬하며, 설명문은
 * `measure-error`(62ch)로 읽는 폭을 잡는다 — 다른 인라인 안내와 같은 규칙이다.
 */
export type StatusCardTone = 'info' | 'danger';

const TONE_BADGE_CLASSES: Readonly<Record<StatusCardTone, string>> = {
  info: 'border-[color:var(--info-line)] bg-[color:var(--info-soft)] text-[color:var(--info)]',
  danger:
    'border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] text-[color:var(--danger)]',
};

export type StatusCardProps = {
  tone: StatusCardTone;
  /** Null/undefined omits the badge entirely instead of rendering it empty. */
  badge?: string | null;
  title: string;
  titleId?: string;
  headingLevel?: 'h1' | 'h2';
  description: string;
  role?: AriaRole;
  ariaLive?: 'polite' | 'assertive';
  showSpinner?: boolean;
  actions?: ReactNode;
  fullScreen?: boolean;
};

export function StatusCard({
  tone,
  badge,
  title,
  titleId,
  headingLevel = 'h1',
  description,
  role,
  ariaLive,
  showSpinner,
  actions,
  fullScreen = true,
}: StatusCardProps) {
  const Heading = headingLevel;

  return (
    <div
      className={cn(
        fullScreen &&
          'flex min-h-screen items-center justify-center bg-[color:var(--bg)] px-4 py-10'
      )}
    >
      <Card
        aria-live={ariaLive}
        className={cn(
          'p-6',
          fullScreen ? 'mx-auto w-full max-w-[440px] text-center' : 'w-full'
        )}
        role={role}
      >
        {badge ? (
          <span
            className={cn(
              'tnum inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border px-2 py-0.5 text-body-sm font-semibold',
              TONE_BADGE_CLASSES[tone]
            )}
          >
            {badge}
          </span>
        ) : null}
        <Heading
          className={cn(
            'mb-2 font-semibold text-fg',
            fullScreen ? 'mt-3 text-h1' : 'mt-[10px] text-h2'
          )}
          id={titleId}
          tabIndex={-1}
        >
          {title}
        </Heading>
        <p
          className={cn(
            'wrap-anywhere mb-5 text-body text-fg-soft',
            !fullScreen && 'measure-error'
          )}
        >
          {description}
        </p>
        {showSpinner ? (
          <Loader2
            aria-hidden='true'
            className={cn(
              'mb-5 size-6 animate-[spin_var(--dur-spinner)_linear_infinite] text-[color:var(--info)]',
              fullScreen && 'mx-auto'
            )}
          />
        ) : null}
        {actions ? (
          <div
            className={cn(
              'flex flex-wrap gap-2',
              fullScreen && 'justify-center'
            )}
          >
            {actions}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
