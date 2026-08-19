import { Button } from '@/components/ui/button';
import { errorCodeCopy } from '@/lib/audience-copy';
import { useCapabilities } from '@/lib/capabilities';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

/**
 * 403 상태. 앱 셸 `<main>` 안에 들어가는 인페이지 상태이므로 왼쪽 정렬한다 —
 * 같은 화면의 다른 안내(`PartialBanner`, `InlineAlert`)와 같은 문법이다.
 * 가운데 뜬 좁은 블록은 셸이 없는 전체 화면 상태의 문법이고, 그건
 * `StatusCard`의 `fullScreen`이 맡는다.
 *
 * **`403 · FORBIDDEN` 배지는 게이트를 탄다.** 예전에는 무조건 렌더링됐는데,
 * 이 컴포넌트가 뜨는 두 경로 중 하나(`batch-operations-page.tsx`의
 * `!can('ops.view')`)는 **정의상 일반 사용자에게만** 보인다. 즉 영문 에러
 * 코드를 절대 보면 안 되는 사람에게 항상 보여주고 있었다(PRODUCT.md "운영
 * 로그와 원본 에러 메시지는 일반 사용자 화면에 노출하지 않는다").
 * 나머지 경로(시장 페이지가 서버에서 403을 받은 경우)는 운영자도 만날 수
 * 있으므로 배지 자체를 지우지 않고 `errorCodeCopy`로 가른다 — 404 화면이
 * 이미 쓰고 있는 규칙과 같다.
 */

export type PermissionStateProps = {
  onNavigateToLatest?: () => void;
  className?: string;
  headingLevel?: 'h1' | 'h2';
  titleId?: string;
};

function goToLatestBrief() {
  navigate('/market/latest');
}

export function PermissionState({
  onNavigateToLatest,
  className,
  headingLevel = 'h1',
  titleId,
}: PermissionStateProps) {
  const Heading = headingLevel;
  const resolvedTitleId = titleId ?? 'page-title';
  const { can } = useCapabilities();
  const badge = errorCodeCopy(
    { canViewOps: can('ops.view') },
    '403 · FORBIDDEN'
  );

  return (
    <div className={cn('py-8', className)}>
      {badge ? (
        <span className='inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] px-2 py-0.5 text-body-sm font-semibold text-[color:var(--danger)]'>
          {badge}
        </span>
      ) : null}
      <Heading
        className={cn(
          'mb-2 text-h1 font-semibold text-fg',
          badge ? 'mt-3' : 'mt-0'
        )}
        id={resolvedTitleId ?? undefined}
        tabIndex={-1}
      >
        이 화면에 접근할 권한이 없습니다
      </Heading>
      <p className='measure-error wrap-anywhere mb-5 text-body text-fg-soft'>
        이 화면은 배치 이력과 파이프라인 로그를 포함하므로 관리자(ADMIN) 권한이
        있는 계정만 열 수 있습니다. 현재 계정은 일반 사용자입니다.
      </p>
      <Button onClick={onNavigateToLatest ?? goToLatestBrief} type='button'>
        최신 브리프로 이동
      </Button>
    </div>
  );
}
