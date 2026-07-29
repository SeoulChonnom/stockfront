import type { MouseEvent } from 'react';

import { createNavigateHandler } from '@/lib/app-state';
import { useCapabilities } from '@/lib/capabilities';
import { withBasePath } from '@/lib/router';
import { cn } from '@/lib/utils';

import {
  isArchiveActive,
  isLatestActive,
  isOpsActive,
  OPS_NAV_GROUP_LABEL,
  OPS_NAV_ITEM,
  PRIMARY_NAV_GROUP,
} from './nav-items';
import { saveScrollPosition } from './scroll-restoration';

/**
 * Shared nav rendering for the desktop rail and the mobile drawer (README
 * §5). Both consumers pass their own `itemMinHeightClass` (40px rail / 48px
 * drawer) and `onNavigate` (drawer closes itself after a link click; the
 * rail has nothing extra to do).
 *
 * The admin-only "운영" group is rendered from a plain `if` — for a
 * non-admin user (`can('ops.view') === false`) that `<div>` is simply never
 * constructed, so it never reaches the DOM (§10, §16-11). CSS-hiding it
 * would not satisfy that requirement; only NOT rendering it does.
 */

const GROUP_LABEL_CLASSES =
  'px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-faint)]';

function NavGroupLabel({ children }: { children: string }) {
  return <p className={GROUP_LABEL_CLASSES}>{children}</p>;
}

function NavDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden='true'
      className={cn(
        'size-1.5 shrink-0 rounded-full bg-current',
        active ? 'opacity-100' : 'opacity-40'
      )}
    />
  );
}

function FailedCountBadge({ count }: { count: number }) {
  return (
    <span
      className='mono ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[color:var(--danger)]'
      data-testid='ops-failed-count-badge'
    >
      {count}
    </span>
  );
}

function NavLink({
  currentRouteKey,
  href,
  label,
  active,
  minHeightClass,
  onNavigate,
  failedCount,
}: {
  currentRouteKey: string;
  href: string;
  label: string;
  active: boolean;
  minHeightClass: string;
  onNavigate?: () => void;
  failedCount?: number | null;
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    saveScrollPosition(currentRouteKey);
    onNavigate?.();
    createNavigateHandler(href)(event);
  }

  return (
    <a
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-[8px] border border-transparent px-2.5 text-[13.5px] font-medium text-[color:var(--text-soft)] transition-[background-color,color] duration-(--dur-fast) ease-(--ease) hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]',
        minHeightClass,
        active &&
          'border-[color:var(--primary-line)] bg-[color:var(--primary-soft)] text-[color:var(--primary)] hover:bg-[color:var(--primary-soft)] hover:text-[color:var(--primary)]'
      )}
      href={withBasePath(href)}
      onClick={handleClick}
    >
      <NavDot active={active} />
      <span className='min-w-0 flex-1 truncate'>{label}</span>
      {failedCount && failedCount > 0 ? (
        <FailedCountBadge count={failedCount} />
      ) : null}
    </a>
  );
}

export function NavList({
  pathname,
  searchParams,
  currentRouteKey,
  itemMinHeightClass,
  onNavigate,
  failedCount,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  currentRouteKey: string;
  itemMinHeightClass: string;
  onNavigate?: () => void;
  failedCount?: number | null;
}) {
  // `useCapabilities()` (not the bare `can()`) so this list re-renders on its
  // own whenever the role changes — e.g. the dev-only role simulator toggling
  // it while the mobile drawer (a NavList instance with no other subscribed
  // ancestor) happens to be open.
  const { can } = useCapabilities();

  return (
    <nav aria-label='주요 메뉴' className='flex flex-col gap-5'>
      <div className='flex flex-col gap-1.5'>
        <NavGroupLabel>{PRIMARY_NAV_GROUP.label}</NavGroupLabel>
        <div className='flex flex-col gap-1'>
          <NavLink
            active={isLatestActive(pathname, searchParams)}
            currentRouteKey={currentRouteKey}
            href={PRIMARY_NAV_GROUP.items[0].href}
            label={PRIMARY_NAV_GROUP.items[0].label}
            minHeightClass={itemMinHeightClass}
            onNavigate={onNavigate}
          />
          <NavLink
            active={isArchiveActive(pathname, searchParams)}
            currentRouteKey={currentRouteKey}
            href={PRIMARY_NAV_GROUP.items[1].href}
            label={PRIMARY_NAV_GROUP.items[1].label}
            minHeightClass={itemMinHeightClass}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {can('ops.view') ? (
        <div className='flex flex-col gap-1.5'>
          <NavGroupLabel>{OPS_NAV_GROUP_LABEL}</NavGroupLabel>
          <div className='flex flex-col gap-1'>
            <NavLink
              active={isOpsActive(pathname)}
              currentRouteKey={currentRouteKey}
              failedCount={failedCount}
              href={OPS_NAV_ITEM.href}
              label={OPS_NAV_ITEM.label}
              minHeightClass={itemMinHeightClass}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      ) : null}
    </nav>
  );
}
