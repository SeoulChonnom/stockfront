import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { ClusterDetail } from '../../lib/view-models';
import { displayPublishedAt, displaySource } from './copy-fallbacks';
import { getSafeExternalUrl } from './url-safety';

/**
 * README §7-5 "대표 기사" sticky aside. Sticky only in the 2-column desktop
 * layout (≥1181px) — the parent grid in `cluster-detail-page.tsx` collapses
 * to 1 column at ≤1180px, at which point this aside stacks normally below
 * the main column instead of pinning.
 */
export function ClusterRepresentativeAside({
  representative,
}: {
  representative: ClusterDetail['representative'];
}) {
  const originalUrl = getSafeExternalUrl(representative.originalUrl);
  const mirrorUrl = representative.mirrorUrl
    ? getSafeExternalUrl(representative.mirrorUrl)
    : null;

  return (
    <aside
      aria-labelledby='cluster-representative-heading'
      className='flex min-w-0 flex-col gap-3 rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 min-[1181px]:sticky min-[1181px]:top-5'
    >
      <span className='text-[11px] font-semibold tracking-[0.07em] text-[color:var(--text-faint)] uppercase'>
        대표 기사
      </span>
      <h2
        className='m-0 text-[14.5px] font-semibold text-[color:var(--text)]'
        id='cluster-representative-heading'
      >
        {representative.title}
      </h2>
      <div className='mono text-[12px] text-[color:var(--text-faint)]'>
        {displaySource(representative.source)} ·{' '}
        {displayPublishedAt(representative.publishedAt)}
      </div>
      <p className='wrap-anywhere m-0 text-[13.5px] text-[color:var(--text-soft)]'>
        {representative.sourceSummary}
      </p>
      <div className='flex flex-col gap-2'>
        {originalUrl ? (
          <Button asChild variant='primary'>
            <a href={originalUrl} rel='noopener noreferrer' target='_blank'>
              원문 보기
              <ExternalLink aria-hidden='true' size={14} />
            </a>
          </Button>
        ) : null}
        {mirrorUrl ? (
          <Button asChild variant='ghost'>
            <a href={mirrorUrl} rel='noopener noreferrer' target='_blank'>
              네이버 미러
              <ExternalLink aria-hidden='true' size={14} />
            </a>
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
