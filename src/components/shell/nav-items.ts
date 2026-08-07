/** Shared nav source; nav-list gates the exported admin item before rendering. */

export type NavLeaf = {
  href: string;
  label: string;
};

export type NavGroup = {
  label: string;
  items: NavLeaf[];
};

export const PRIMARY_NAV_GROUP: NavGroup = {
  label: '시장 인텔리전스',
  items: [
    { href: '/market/latest', label: '최신 브리프' },
    { href: '/market/archive/search', label: '아카이브' },
  ],
};

export const OPS_NAV_GROUP_LABEL = '운영';
export const OPS_NAV_ITEM: NavLeaf = {
  href: '/ops/batches',
  label: '배치 운영',
};

export function isLatestActive(
  pathname: string,
  searchParams: URLSearchParams
): boolean {
  if (pathname === '/market/latest') {
    return true;
  }

  if (pathname.startsWith('/market/cluster/')) {
    return searchParams.get('origin') === 'latest';
  }

  return false;
}

export function isArchiveActive(
  pathname: string,
  searchParams: URLSearchParams
): boolean {
  if (pathname.startsWith('/market/archive')) {
    return true;
  }

  if (pathname.startsWith('/market/cluster/')) {
    return searchParams.get('origin') !== 'latest';
  }

  return false;
}

export function isOpsActive(pathname: string): boolean {
  return pathname.startsWith('/ops/batches');
}

export type NavContext = {
  groupLabel: string;
  itemLabel: string;
};

export function getActiveNavContext(
  pathname: string,
  searchParams: URLSearchParams
): NavContext {
  if (isLatestActive(pathname, searchParams)) {
    return { groupLabel: PRIMARY_NAV_GROUP.label, itemLabel: '최신 브리프' };
  }

  if (isArchiveActive(pathname, searchParams)) {
    return { groupLabel: PRIMARY_NAV_GROUP.label, itemLabel: '아카이브' };
  }

  if (isOpsActive(pathname)) {
    return { groupLabel: OPS_NAV_GROUP_LABEL, itemLabel: OPS_NAV_ITEM.label };
  }

  return { groupLabel: 'Market Brief', itemLabel: '페이지를 찾을 수 없음' };
}
