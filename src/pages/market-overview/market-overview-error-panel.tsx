import { StatusCard } from '@/components/shell/status-card';
import { useAnnounce } from '@/components/shell/use-announce';
import { Button } from '@/components/ui/button';
import { navigate } from '@/lib/router';

import type { FetchErrorPresentation } from '@/pages/market-overview/error-presentation';

/** Region-local error state with a recovery action; Archive 404 renders elsewhere. */
export function MarketOverviewErrorPanel({
  presentation,
  canViewOps,
  onRetry,
  headingLevel = 'h1',
  titleId = 'page-title',
}: {
  presentation: FetchErrorPresentation;
  canViewOps: boolean;
  onRetry?: () => void;
  headingLevel?: 'h1' | 'h2';
  titleId?: string;
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
      headingLevel={headingLevel}
      role='alert'
      title={presentation.title}
      titleId={titleId}
      tone='danger'
    />
  );
}
