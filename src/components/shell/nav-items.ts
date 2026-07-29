/**
 * Primary navigation data + active-route rules — README §5.
 *
 * Single source of truth for the nav tree so the desktop rail
 * (`nav-rail.tsx`) and the mobile drawer (`nav-drawer.tsx`) can never drift
 * from each other. The "운영" (Operator-only) leaf is intentionally kept out
 * of this module's exported groups — `nav-list.tsx` renders it from a
 * separate export and gates it with `can('ops.view')` so it can be omitted
 * from the DOM entirely for Viewers (§10, §16-11), not merely hidden.
 */

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

/** `/market/latest` itself, or a Cluster Detail entered from Latest (`origin=latest`). */
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

/**
 * `/market/archive/*`, or a Cluster Detail entered from anywhere other than
 * Latest (§5: "`/market/cluster/*`는 진입 원점에 따라 최신 브리프 또는
 * 아카이브를 활성으로 표시" — the two are mutually exclusive, so "not
 * latest" defaults here, including a missing `origin`).
 */
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

/** Drives the mobile compact header's "section label / current route" pair (§5). */
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
