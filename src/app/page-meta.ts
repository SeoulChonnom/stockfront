import type { AppRoute } from '../lib/app-state';

type PageMeta = {
  title: string;
  topSearchPlaceholder: string;
};

const STATIC_PAGE_META: Record<
  Exclude<AppRoute['page'], 'archive-market'>,
  PageMeta
> = {
  latest: {
    title: 'Market Daily Brief - Latest Market',
    topSearchPlaceholder: 'Search market briefs',
  },
  'archive-search': {
    title: 'Market Daily Brief - Archive Search',
    topSearchPlaceholder: 'Search archive records',
  },
  'cluster-detail': {
    title: 'Market Daily Brief - News Cluster Detail',
    topSearchPlaceholder: 'Search related clusters',
  },
  'batch-ops': {
    title: 'Market Daily Brief - Batch Operations',
    topSearchPlaceholder: 'Search operations',
  },
  'not-found': {
    title: 'Market Daily Brief',
    topSearchPlaceholder: 'Search',
  },
};

export function getPageMeta(route: AppRoute): PageMeta {
  if (route.page === 'archive-market') {
    return {
      title: `Market Daily Brief - Archive ${route.businessDate}`,
      topSearchPlaceholder: 'Search archived summaries',
    };
  }

  return STATIC_PAGE_META[route.page];
}
