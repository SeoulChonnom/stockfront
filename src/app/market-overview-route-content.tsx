import { PageMessage } from '../components/ui';
import { MarketOverviewPage } from '../pages/market-overview-page';

export function MarketOverviewRouteContent({
  error,
  isLoading,
  mode,
  snapshot,
  title,
}: {
  error: Error | null;
  isLoading: boolean;
  mode: 'latest' | 'archive';
  snapshot: Parameters<typeof MarketOverviewPage>[0]['snapshot'] | undefined;
  title: string;
}) {
  if (isLoading) {
    return (
      <PageMessage
        description="시장 요약 데이터를 불러오는 중입니다."
        title="Loading Market Data"
      />
    );
  }

  if (error) {
    return (
      <PageMessage
        description={error.message}
        title="Market Data Unavailable"
      />
    );
  }

  if (!snapshot) {
    return (
      <PageMessage
        description="표시할 시장 요약 데이터가 없습니다."
        title="No Market Data"
      />
    );
  }

  return <MarketOverviewPage mode={mode} snapshot={snapshot} title={title} />;
}
