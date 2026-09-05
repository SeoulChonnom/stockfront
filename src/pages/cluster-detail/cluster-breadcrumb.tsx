import { InlineAlert } from '@/components/state';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { createNavigateHandler } from '@/lib/app-state';
import { withBasePath } from '@/lib/router';
import { getOriginLink } from '@/pages/cluster-detail/origin-link';

/**
 * `nav[aria-label="위치"]` breadcrumb with an origin-aware first
 * segment, market label, current page. Clicking the first segment is what
 * satisfies the browser-Back contract ("Back: 원점
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
      <Breadcrumb aria-label='위치'>
        <BreadcrumbList className='gap-1.5 text-body-sm text-faint sm:gap-1.5'>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a
                className='tap-target text-fg-soft underline-offset-2 hover:underline'
                href={withBasePath(href)}
                onClick={createNavigateHandler(href)}
              >
                {label}
              </a>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {/* Breadcrumb separators are plain slashes, not chevron icons. */}
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <span className='wrap-anywhere'>{marketLabel}</span>
          </BreadcrumbItem>
          {/* Keep the same separator for every breadcrumb level. */}
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className='font-semibold text-fg-soft'>
              이슈 상세
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {origin === null ? (
        <InlineAlert tone='info'>
          진입 경로 정보가 없어 이 이슈의 기준일({businessDate}) 브리프로
          돌아갑니다.
        </InlineAlert>
      ) : null}
    </div>
  );
}
