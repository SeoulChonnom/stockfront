import type { AppRoute } from '../lib/app-state';

type PageMeta = {
  title: string;
};

const STATIC_PAGE_META: Record<
  Exclude<AppRoute['page'], 'archive-market'>,
  PageMeta
> = {
  latest: { title: 'Market Brief · 최신 브리프' },
  'archive-search': { title: 'Market Brief · 아카이브' },
  'cluster-detail': { title: 'Market Brief · 이슈 상세' },
  'batch-ops': { title: 'Market Brief · 배치 운영' },
  'not-found': { title: 'Market Brief · 페이지를 찾을 수 없음' },
};

export function getPageMeta(route: AppRoute): PageMeta {
  if (route.page === 'archive-market') {
    return { title: `Market Brief · ${route.businessDate} 시장 브리프` };
  }

  return STATIC_PAGE_META[route.page];
}
