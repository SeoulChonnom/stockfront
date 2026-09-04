import { Archive, Newspaper, ServerCog } from 'lucide-react';
import type { ComponentType, MouseEvent } from 'react';
import { getNavSections } from '@/components/shell/nav-items';
import { saveScrollPosition } from '@/components/shell/scroll-restoration';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { createNavigateHandler } from '@/lib/app-state';
import { useCapabilities } from '@/lib/capabilities';
import { withBasePath } from '@/lib/router';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<{ 'aria-hidden'?: 'true'; size?: number }>;

/** 목적지마다 하나씩. 그림이 라벨을 대신하는 게 아니라 라벨과 함께 읽힌다. */
const ICONS: Readonly<Record<string, IconComponent>> = {
  '/market/latest': Newspaper,
  '/market/archive/search': Archive,
  '/ops/batches': ServerCog,
};

function FailedCountBadge({ count }: { count: number }) {
  return (
    <span
      aria-label='최근 7일 실패'
      className='tnum inline-flex min-w-[20px] items-center justify-center rounded-full border border-danger-line bg-danger-soft px-1.5 text-label font-semibold text-danger'
      data-testid='ops-failed-count-badge'
      role='status'
      title='최근 7일 실패'
    >
      {count}
    </span>
  );
}

/**
 * 헤더 중앙의 사이트맵. 목적지가 전부 한 줄에 펼쳐진 세그먼트 컨트롤이며,
 * 좌측 레일과 모바일 드로어를 함께 대체한다.
 *
 * 활성 목적지는 여기서 색으로 드러난다 — 레일이 사라진 뒤 "지금 어디"를 말하는
 * 유일한 자리다. 브리프 화면의 `<h1>`은 목적지 이름이 아니라 그날의 헤드라인
 * 이라 그 역할을 대신하지 못한다.
 *
 * 라벨은 `sm` 아래에서 시각적으로만 접힌다(`sr-only`는 유지). 390px에서 아이콘과
 * 글자를 모두 펼치면 워드마크를 잘라야 하는데, 목적지 세 개의 글자를 잠시
 * 접는 쪽이 제품 이름을 자르는 것보다 싸다. 신원 블록도 같은 폭에서 이름을
 * 접어(`profile-menu.tsx`) 이 줄에 자리를 내준다.
 */
export function SitemapNav({
  pathname,
  searchParams,
  currentRouteKey,
  failedCount,
  className,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  currentRouteKey: string;
  failedCount: number | null;
  className?: string;
}) {
  // useCapabilities()가 역할이 바뀔 때 운영 버튼을 다시 그리게 한다.
  const { can } = useCapabilities();
  const sections = getNavSections(pathname, searchParams, can('ops.view'));
  const entries = sections.flatMap((section) => section.entries);
  const failed = failedCount ?? 0;

  function handleNavigate(href: string) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      saveScrollPosition(currentRouteKey);
      createNavigateHandler(href)(event);
    };
  }

  return (
    <nav aria-label='주요 메뉴' className={className}>
      <ButtonGroup>
        {entries.map((entry) => {
          const Icon = ICONS[entry.href];

          return (
            <Button
              asChild
              className={cn(
                'tap-target h-9 gap-2 px-2.5 text-body-sm font-medium text-fg-soft sm:px-3',
                entry.active &&
                  'bg-primary-soft font-semibold text-primary hover:bg-primary-soft hover:text-primary'
              )}
              key={entry.href}
              size='sm'
              variant='outline'
            >
              <a
                aria-current={entry.active ? 'page' : undefined}
                href={withBasePath(entry.href)}
                onClick={handleNavigate(entry.href)}
              >
                <Icon aria-hidden='true' size={15} />
                <span className='sr-only sm:not-sr-only'>{entry.label}</span>
                {entry.showsFailedCount && failed > 0 ? (
                  <FailedCountBadge count={failed} />
                ) : null}
              </a>
            </Button>
          );
        })}
      </ButtonGroup>
    </nav>
  );
}
