import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { formatInteger } from '../../lib/formatters';
import { navigate } from '../../lib/router';
import type { ClusterDetail } from '../../lib/view-models';
import { getOriginLink } from './origin-link';

/**
 * README §7-5 header card. The "돌아가기" action is origin-aware (D14),
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
    // B4: header card gap is 14px in the design, not 16px.
    <Card className='flex min-w-0 flex-col gap-3.5 p-5'>
      <div className='mono flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[color:var(--text-soft)]'>
        <span className='rounded-[var(--r-sm)] border border-[color:var(--line-strong)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--text-faint)] uppercase'>
          {detail.marketLabel}
        </span>
        <span className='text-[color:var(--text-faint)]'>기준일</span>
        <span className='font-semibold text-[color:var(--text)]'>
          {detail.businessDate}
        </span>
        <span aria-hidden='true'>·</span>
        <span>기사 {formatInteger(detail.articleCount)}건</span>
        <span aria-hidden='true'>·</span>
        <span>갱신 {detail.updatedAt}</span>
      </div>

      <h1
        className='m-0 text-[21px] leading-[1.35] font-semibold tracking-[-0.015em] text-[color:var(--text)] text-pretty sm:text-[26px] wrap-anywhere'
        id='page-title'
        tabIndex={-1}
      >
        {detail.title}
      </h1>

      {/* D11: header lead paragraph between the h1 and the tag row. */}
      {detail.summary ? (
        <p className='measure-summary wrap-anywhere text-pretty m-0 text-[length:var(--fs-lead)] text-[color:var(--text-soft)]'>
          {detail.summary}
        </p>
      ) : null}

      {detail.tags.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {detail.tags.map((tag) => (
            <span
              // W3 (parity cycle 7): design chip padding is `3px 9px`, not
              // the Tailwind-scale `py-0.5 px-2` (2px/8px) — the 1px-per-side
              // vertical shortfall was the whole cause of this row measuring
              // 2px short against the design (`tag-row` height diff), which
              // fed into `header-card`'s own height diff below.
              className='rounded-[var(--r-sm)] border border-[color:var(--line)] bg-[color:var(--surface-2)] px-[9px] py-[3px] text-[12px] text-[color:var(--text-soft)]'
              key={tag}
            >
              {/* C7: design tags are plain chips, no "#" prefix. */}
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* F3: design has a divider between the tags and the action row. */}
      <div className='flex flex-wrap gap-2 border-t border-[color:var(--line)] pt-3'>
        {/* W3 (parity cycle 7) — ROOT CAUSE, NOT FIXED ON PURPOSE: the
            design's own two buttons here are `min-height:40px;padding:0
            14px`, 4px shorter than the app's default `Button` size
            (`min-h-11`/44px). That 4px is the entire `action-row` height
            diff, and it re-surfaces in `header-card` (after netting
            against the tag-chip padding fix below) and doubles to 8px at
            390px once the row wraps to two lines. Switching these two to
            `size="sm"` (`min-h-10`/40px) would close it exactly, but that
            drops below the 44×44 touch-target floor
            (docs/design_v2/11-design-system-interaction-spec.md §9) for a
            primary navigation action — the same trade-off cycle 6 already
            declined for pagination. Left at the default size; the
            remaining `action-row`/`header-card` height delta is this,
            fully explained, and intentionally not "fixed" for pixel
            parity. */}
        <Button
          onClick={() => navigate(back.href)}
          type='button'
          variant='ghost'
        >
          <ArrowLeft aria-hidden='true' size={16} />
          {backLabel}
        </Button>
        {/* F4: design has no icon on this button. */}
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
