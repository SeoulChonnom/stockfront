import { ArrowLeft, CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { formatInteger } from '../../lib/formatters';
import { navigate } from '../../lib/router';
import type { ClusterDetail } from '../../lib/view-models';

/**
 * README §7-5 header card. The two action buttons are literal per spec
 * (always "최신 브리프로 돌아가기" + this cluster's OWN business-date
 * brief) — distinct from `ClusterBreadcrumb`'s origin-aware first segment,
 * which is what actually implements the §9 "Back: 원점 route" contract.
 * These are fixed convenience shortcuts, not origin-tracking navigation.
 */
export function ClusterHeader({ detail }: { detail: ClusterDetail }) {
  return (
    <div className='flex min-w-0 flex-col gap-4 rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5'>
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

      {detail.tags.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {detail.tags.map((tag) => (
            <span
              className='rounded-[var(--r-sm)] border border-[color:var(--line)] bg-[color:var(--surface-2)] px-2 py-0.5 text-[12px] text-[color:var(--text-soft)]'
              key={tag}
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className='flex flex-wrap gap-2'>
        <Button
          onClick={() => navigate('/market/latest')}
          type='button'
          variant='ghost'
        >
          <ArrowLeft aria-hidden='true' size={16} />
          최신 브리프로 돌아가기
        </Button>
        <Button
          onClick={() => navigate(`/market/archive/${detail.businessDate}`)}
          type='button'
          variant='secondary'
        >
          <CalendarDays aria-hidden='true' size={16} />
          {detail.businessDate} 시장 브리프 보기
        </Button>
      </div>
    </div>
  );
}
