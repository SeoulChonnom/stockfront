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
  const ownBriefHref = `/market/archive/${detail.businessDate}`;
  const backLabel =
    origin === 'latest'
      ? '최신 브리프로 돌아가기'
      : origin
        ? `${origin} 브리프로 돌아가기`
        : '해당 날짜 브리프 열기';

  // 진입 경로 없이 직접 들어오면 `getOriginLink`가 이 클러스터의 기준일
  // 브리프를 되돌아갈 곳으로 준다 — 그럼 아래 "…시장 브리프 보기"와 목적지가
  // 같아져서, 같은 곳으로 가는 버튼 두 개가 나란히 놓인다. 그때는 하나만
  // 남긴다. 어디로 갈지 고르라고 하면서 선택지가 하나뿐인 셈이기 때문이다.
  const showOwnBriefShortcut = back.href !== ownBriefHref;

  return (
    <Card className='flex min-w-0 flex-col gap-3.5 p-5'>
      <div className='tnum flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-fg-soft'>
        <span className='rounded-[var(--r-sm)] border border-[color:var(--line-strong)] px-2 py-0.5 text-label font-semibold tracking-caps text-faint uppercase'>
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
        className='m-0 text-display font-semibold text-fg text-pretty wrap-anywhere'
        id='page-title'
        tabIndex={-1}
      >
        {detail.title}
      </h1>

      {/* Optional summary appears between the title and tag row. */}
      {detail.summary ? (
        <p className='measure-summary wrap-anywhere text-pretty m-0 text-lead text-fg-soft'>
          {detail.summary}
        </p>
      ) : null}

      {detail.tags.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {detail.tags.map((tag) => (
            <span
              // Preserve the measured 3px/9px chip padding.
              className='rounded-[var(--r-sm)] border border-line bg-[color:var(--surface-2)] px-[9px] py-[3px] text-label text-fg-soft'
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
        {showOwnBriefShortcut ? (
          <Button
            onClick={() => navigate(ownBriefHref)}
            type='button'
            variant='secondary'
          >
            {detail.businessDate} 시장 브리프 보기
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
