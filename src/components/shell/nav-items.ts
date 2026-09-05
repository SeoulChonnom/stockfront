/**
 * 내비게이션의 단일 출처. 헤더의 Sitemap 메뉴가 이 모듈만 읽는다.
 *
 * `getNavSections`가 권한 게이팅까지 맡는다 — `ops.view`가 없으면 운영 섹션은
 * 숨겨지는 게 아니라 배열에서 아예 빠진다. 렌더러가 조건 분기를 다시 하지
 * 않으므로, 권한 규칙이 두 곳으로 갈라질 여지가 없다.
 */

type NavEntry = {
  href: string;
  label: string;
  active: boolean;
  /** 운영 항목만 최근 7일 실패 건수를 배지로 단다. */
  showsFailedCount?: boolean;
};

export type NavSection = {
  label: string;
  entries: NavEntry[];
};

const PRIMARY_GROUP_LABEL = '시장 인텔리전스';
const OPS_GROUP_LABEL = '운영';

const LATEST = { href: '/market/latest', label: '최신 브리프' };
const ARCHIVE = { href: '/market/archive/search', label: '아카이브' };
const OPS = { href: '/ops/batches', label: '배치 운영' };

function isLatestActive(
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

function isArchiveActive(
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

function isOpsActive(pathname: string): boolean {
  return pathname.startsWith('/ops/batches');
}

export function getNavSections(
  pathname: string,
  searchParams: URLSearchParams,
  canViewOps: boolean
): NavSection[] {
  const sections: NavSection[] = [
    {
      label: PRIMARY_GROUP_LABEL,
      entries: [
        { ...LATEST, active: isLatestActive(pathname, searchParams) },
        { ...ARCHIVE, active: isArchiveActive(pathname, searchParams) },
      ],
    },
  ];

  if (canViewOps) {
    sections.push({
      label: OPS_GROUP_LABEL,
      entries: [
        { ...OPS, active: isOpsActive(pathname), showsFailedCount: true },
      ],
    });
  }

  return sections;
}
