import { Bolt, CalendarDays, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InfoBadge } from '../components/ui';
import { createNavigateHandler, getStatusClass } from '../lib/app-state';
import { buildUrl } from '../lib/router';
import type {
  ClusterCard,
  MarketIndex,
  MarketSnapshot,
} from '../lib/view-models';

export function MarketOverviewPage({
  mode,
  snapshot,
  title,
}: {
  mode: 'latest' | 'archive';
  snapshot: MarketSnapshot;
  title: string;
}) {
  return (
    <div className='page-stack'>
      <section className='hero-header'>
        <div className='hero-copy'>
          <div className='eyebrow-row'>
            <span className='eyebrow'>Market Daily Brief</span>
            <span className={getStatusClass(snapshot.status)}>
              {snapshot.status}
            </span>
          </div>
          <h1 id='page-title' tabIndex={-1}>
            {mode === 'latest'
              ? `${snapshot.businessDate} 글로벌 시장 요약`
              : `${snapshot.businessDate} 아카이브 시장 요약`}
          </h1>
          <p>
            {title} 화면은 API 응답 기반으로 렌더링됩니다. 데이터 패칭과 화면
            상태 관리는 React query 계층으로 분리했습니다.
          </p>
          <div className='meta-row'>
            <span>
              <CalendarDays size={16} />
              Business Date <strong>{snapshot.businessDate}</strong>
            </span>
            <span>
              <Clock3 size={16} />
              Generated <strong>{snapshot.generatedAt}</strong>
            </span>
          </div>
        </div>

        <div className='callout-card'>
          <div className='callout-icon'>
            <Bolt size={22} />
          </div>
          <div>
            <span className='eyebrow'>Global Market Insight</span>
            <h2>{snapshot.globalHeadline}</h2>
          </div>
        </div>
      </section>

      {snapshot.markets.map((market) => (
        <section className='section-stack' key={market.label}>
          <div className='section-header'>
            <div>
              <h3>{market.label}</h3>
              <p>{market.summaryTitle}</p>
            </div>
            <div className='section-line' />
          </div>

          <div className='market-summary-card'>
            <div className='market-summary-copy'>
              <span className='eyebrow'>Analyst Narrative</span>
              <p>{market.summaryBody}</p>
            </div>
            <div className='metric-badges'>
              <InfoBadge
                label='Index Set'
                value={`${market.indices.length}개`}
              />
              <InfoBadge
                label='News Clusters'
                value={`${market.clusters.length}개`}
              />
            </div>
          </div>

          <div className='index-grid'>
            {market.indices.map((item) => (
              <IndexCard item={item} key={item.label} />
            ))}
          </div>

          <div className='cluster-grid'>
            {market.clusters.map((cluster) => (
              <ClusterPreviewCard
                key={cluster.id}
                snapshot={snapshot}
                cluster={cluster}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function IndexCard({ item }: { item: MarketIndex }) {
  return (
    <Card className='panel index-card'>
      <CardContent className='p-6'>
        <div className='index-card-top'>
          <div>
            <p className='muted-label'>{item.label}</p>
            <h4>{item.value}</h4>
          </div>
          <div className='delta-block'>
            <strong
              className={item.direction === 'up' ? 'trend-up' : 'trend-down'}
            >
              {item.change}
            </strong>
            <span
              className={
                item.direction === 'up'
                  ? 'status-chip status-chip-success'
                  : 'status-chip status-chip-failed'
              }
            >
              {item.changeRate}
            </span>
          </div>
        </div>

        <dl className='mini-grid'>
          <div>
            <dt>High</dt>
            <dd>{item.high}</dd>
          </div>
          <div>
            <dt>Low</dt>
            <dd>{item.low}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function ClusterPreviewCard({
  cluster,
  snapshot,
}: {
  cluster: ClusterCard;
  snapshot: MarketSnapshot;
}) {
  const archiveHref = buildUrl('/market/archive/search', {
    from: snapshot.businessDate,
    to: snapshot.businessDate,
    status: 'READY',
    page: 1,
  });
  const detailHref = `/market/cluster/${cluster.id}`;

  return (
    <Card className='panel cluster-card'>
      <CardContent className='grid gap-6 p-6'>
        <div className='cluster-card-copy'>
          <div className='cluster-card-head'>
            <h4>{cluster.title}</h4>
            <span className='soft-chip'>{cluster.articleCount}건</span>
          </div>
          <p>{cluster.summary}</p>
          <div className='tag-row'>
            {cluster.tags.map((tag) => (
              <span className='tag' key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div className='action-row'>
          <Button asChild variant='secondary'>
            <a href={archiveHref} onClick={createNavigateHandler(archiveHref)}>
              Source View
            </a>
          </Button>
          <Button asChild variant='primary'>
            <a href={detailHref} onClick={createNavigateHandler(detailHref)}>
              Detail View
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
