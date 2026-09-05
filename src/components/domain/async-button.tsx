import type * as React from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface AsyncButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
}

/**
 * `ui/button.tsx`는 shadcn CLI 산출물 그대로 유지해야 해서 loading 계약을
 * 여기로 옮겼다. 호출부가 `disabled`+`aria-busy`를 매번 손으로 맞추게 하면
 * 조용히 빠질 수 있어 래퍼로 강제한다.
 *
 * `asChild`일 때는 children 앞에 스피너를 끼워 넣지 않는다 — Slot은 자식을
 * 정확히 하나만 받아 합성하므로 스피너를 추가하면 깨진다(기존 ui/button.tsx의
 * 판단을 그대로 유지).
 */
function AsyncButton({
  loading = false,
  disabled,
  asChild,
  children,
  ...props
}: AsyncButtonProps) {
  return (
    <Button
      aria-busy={loading || undefined}
      asChild={asChild}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {/*
           * 레지스트리 Spinner는 role="status" aria-label="Loading"을 달고
           * 있다. 이 앱은 한국어 UI이고 버튼에 이미 aria-busy가 붙으므로,
           * 그대로 두면 스크린리더가 영어 "Loading"을 읽고 aria-busy와
           * 의미가 중복된다. 시각 스피너만 남기고 접근성 트리에서는 숨긴다.
           */}
          {loading && (
            // biome-ignore lint/a11y/useValidAriaRole: 레지스트리 기본값(status)을 명시적으로 지우기 위한 의도된 undefined
            <Spinner
              aria-hidden='true'
              aria-label={undefined}
              role={undefined}
            />
          )}
          {children}
        </>
      )}
    </Button>
  );
}

export { AsyncButton };
