import { InlineAlert } from '@/components/state';

import { createNavigateHandler } from '../../lib/app-state';
import { withBasePath } from '../../lib/router';
import { getOriginLink } from './origin-link';

/**
 * README §7-5 breadcrumb: `nav[aria-label="위치"]`, origin-aware first
 * segment, market label, current page. Clicking the first segment is what
 * actually satisfies the §9 "Cluster 진입" Back contract ("Back: 원점
 * route") — `App.tsx`'s generic route-change effect restores that route's
 * scroll position for free once `navigate()` lands there, since the origin
 * page is responsible for having saved its own scroll before sending the
 * user into this cluster (see `scroll-restoration.ts`'s doc comment).
 */
export function ClusterBreadcrumb({
  origin,
  marketLabel,
  businessDate,
}: {
  origin: string | null;
  marketLabel: string;
  businessDate: string;
}) {
  const { label, href } = getOriginLink(origin, businessDate);

  return (
    <div className='flex min-w-0 flex-col gap-3'>
      <nav
        aria-label='위치'
        className='flex flex-wrap items-center gap-1.5 text-body-sm text-faint'
      >
        <a
          className='text-fg-soft underline-offset-2 hover:underline'
          href={withBasePath(href)}
          onClick={createNavigateHandler(href)}
        >
          {label}
        </a>
        {/* D13: design separator is a plain "/", not a chevron icon. */}
        <span aria-hidden='true'>/</span>
        <span className='wrap-anywhere'>{marketLabel}</span>
        {/* D13: design separator is a plain "/", not a chevron icon. */}
        <span aria-hidden='true'>/</span>
        <span aria-current='page' className='font-semibold text-fg-soft'>
          이슈 상세
        </span>
      </nav>
      {origin === null ? (
        <InlineAlert tone='info'>
          진입 경로 정보가 없어 이 이슈의 기준일({businessDate}) 브리프로
          돌아갑니다.
        </InlineAlert>
      ) : null}
    </div>
  );
}
