import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { formatInteger } from '../../lib/formatters';
import { navigate } from '../../lib/router';
import type { ClusterDetail } from '../../lib/view-models';
import { getOriginLink } from './origin-link';

/**
 * Header card. The "돌아가기" action is origin-aware,
 * sharing `ClusterBreadcrumb`'s `getOriginLink` three-way branch
 * (latest / archive date / direct-entry) so its label and destination
 * always agree with the breadcrumb's own first segment — the second
 * button (this cluster's OWN business-date brief) stays a fixed,
 * non-origin-tracking shortcut per spec.
 */
export function ClusterHeader({
  detail,
  origin,
}: {
  detail: ClusterDetail;
  origin: string | null;
}) {
  const back = getOriginLink(origin, detail.businessDate);
  const backLabel =
    origin === 'latest'
      ? '최신 브리프로 돌아가기'
      : origin
        ? `${origin} 브리프로 돌아가기`
        : '해당 날짜 브리프 열기';

  return (
    <Card className='flex min-w-0 flex-col gap-3.5 p-5'>
      <div className='mono flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-fg-soft'>
        <span className='rounded-[var(--r-sm)] border border-[color:var(--line-strong)] px-2 py-0.5 text-label font-semibold text-faint uppercase'>
          {detail.marketLabel}
        </span>
        <span className='text-faint'>기준일</span>
        <span className='font-semibold text-fg'>{detail.businessDate}</span>
        <span aria-hidden='true'>·</span>
        <span>기사 {formatInteger(detail.articleCount)}건</span>
        <span aria-hidden='true'>|</span>
        <span>갱신 {detail.updatedAt}</span>
      </div>

      <h1
        className='m-0 text-[21px] leading-[1.35] font-semibold tracking-[-0.015em] text-fg text-pretty sm:text-[26px] wrap-anywhere'
        id='page-title'
        tabIndex={-1}
      >
        {detail.title}
      </h1>

      {/* Optional summary appears between the title and tag row. */}
      {detail.summary ? (
        <p className='measure-summary wrap-anywhere text-pretty m-0 text-[length:var(--fs-lead)] text-fg-soft'>
          {detail.summary}
        </p>
      ) : null}

      {detail.tags.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {detail.tags.map((tag) => (
            <span
              // Preserve the measured 3px/9px chip padding.
              className='rounded-[var(--r-sm)] border border-line bg-[color:var(--surface-2)] px-[9px] py-[3px] text-[12px] text-fg-soft'
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className='flex flex-wrap gap-2 border-t border-line pt-3'>
        {/* Keep the default Button size to preserve the 44px touch target. */}
        <Button
          onClick={() => navigate(back.href)}
          type='button'
          variant='ghost'
        >
          <ArrowLeft aria-hidden='true' size={16} />
          {backLabel}
        </Button>
        <Button
          onClick={() => navigate(`/market/archive/${detail.businessDate}`)}
          type='button'
          variant='secondary'
        >
          {detail.businessDate} 시장 브리프 보기
        </Button>
      </div>
    </Card>
  );
}
