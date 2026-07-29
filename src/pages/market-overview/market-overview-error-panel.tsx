import { StatusCard } from '@/components/shell/status-card';
import { useAnnounce } from '@/components/shell/use-announce';
import { Button } from '@/components/ui/button';
import { navigate } from '@/lib/router';

import type { FetchErrorPresentation } from './error-presentation';

/**
 * FAILED/5xx/401/429/offline/malformed 오류 상태 — README §8: "오류는 영향
 * 받는 영역 안에서만 나타나고 항상 복구 액션을 가진다." Archive 404는 이
 * 컴포넌트가 아니라 `ArchiveNotFoundState`(날짜 내비게이션이 함께 필요해
 * 별도 화면)가 처리한다 — `market-overview-route-content.tsx`가 분기한다.
 *
 * 이 화면은 실제 `refetch()` 콜백을 받지 않는다 — `app-page-content.tsx`
 * (다른 에이전트 소유, 수정 범위 밖)가 현재 `error`/`isLoading`/`snapshot`
 * 만 넘기고 query의 `refetch`/`isFetching`은 넘기지 않기 때문이다. 기본
 * 동작은 전체 새로고침(`App.tsx`의 인증 실패 재시도와 동일 패턴)이며,
 * `onRetry`가 나중에 실제로 연결되면 그대로 대체된다. 자세한 내용은
 * 리포트 참고.
 */
export function MarketOverviewErrorPanel({
  presentation,
  canViewOps,
  onRetry,
}: {
  presentation: FetchErrorPresentation;
  canViewOps: boolean;
  onRetry?: () => void;
}) {
  const announce = useAnnounce();

  function handlePrimaryAction() {
    if (presentation.actionKind === 'archive-search') {
      navigate('/market/archive/search');
      return;
    }

    if (presentation.actionKind === 'ops' && canViewOps) {
      navigate('/ops/batches');
      return;
    }

    if (presentation.actionKind === 'reload') {
      window.location.reload();
      return;
    }

    announce('다시 불러오는 중입니다.');
    (onRetry ?? (() => window.location.reload()))();
  }

  const primaryLabel =
    presentation.actionKind === 'ops' && !canViewOps
      ? '다시 시도'
      : presentation.actionLabel;

  return (
    <StatusCard
      actions={
        <Button onClick={handlePrimaryAction} type='button'>
          {primaryLabel}
        </Button>
      }
      ariaLive='assertive'
      badge={presentation.code}
      description={presentation.message}
      fullScreen={false}
      role='alert'
      title={presentation.title}
      titleId='page-title'
      tone='danger'
    />
  );
}
