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
      // Per-element margins keep heading spacing independent from the card gap.
      className='flex min-w-0 flex-col rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] p-[18px] min-[1181px]:sticky min-[1181px]:top-5'
    >
      {/* The h2 is the accessible section label; the article title follows. */}
      <h2
        className='m-0 mb-1 text-[12px] font-semibold tracking-[0.07em] text-faint uppercase'
        id='cluster-representative-heading'
      >
        대표 기사
      </h2>
      <p className='m-0 mb-2 text-card-heading font-semibold text-fg'>
        {representative.title}
      </p>
      <div className='mono mb-3 flex flex-col gap-0.5 text-caption text-faint'>
        <span>{displaySource(representative.source)}</span>
        <span>{displayPublishedAt(representative.publishedAt)}</span>
        {representative.sourceSummary ? (
          <span className='font-sans text-body text-fg-soft'>
            {representative.sourceSummary}
          </span>
        ) : null}
      </div>
      <div className='flex flex-wrap gap-2'>
        {originalUrl ? (
          <Button asChild className='w-auto' variant='primary'>
            <a href={originalUrl} rel='noopener noreferrer' target='_blank'>
              원문 보기
              <ExternalLink aria-hidden='true' size={14} />
            </a>
          </Button>
        ) : null}
        {mirrorUrl ? (
          <Button asChild className='w-auto' variant='ghost'>
            <a href={mirrorUrl} rel='noopener noreferrer' target='_blank'>
              네이버 미러 <ExternalLink aria-hidden='true' size={14} />
            </a>
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
