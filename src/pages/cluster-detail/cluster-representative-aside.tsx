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
      // N3 (parity cycle 3): design lays out this card via explicit
      // per-element margin-bottom (4/8/12px), not a uniform flex `gap` —
      // switched from `gap-3` to per-child `mb-*` below so the heading can
      // carry its own 4px without stacking on top of a container gap.
      className='flex min-w-0 flex-col rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-[18px] min-[1181px]:sticky min-[1181px]:top-5'
    >
      {/* A3 (parity cycle 2): design's `h2` IS the "대표 기사" label itself
          (uppercase caps, --text-faint) — the article title is a plain
          paragraph below it, not the heading. Cycle 1 had this backwards
          (the label was a plain span, the title carried the `h2`), which
          gave the aside the wrong accessible name — a real a11y bug, not
          just a style mismatch.
          N3: design is 12px/letter-spacing:.07em (→0.84px)/margin:0 0 4px,
          not 11px/0.77px/0 — `tracking-[0.07em]` already matches the
          design's em-based ratio, it just needed the larger base size to
          land on 0.84px. */}
      <h2
        className='m-0 mb-1 text-[12px] font-semibold tracking-[0.07em] text-[color:var(--text-faint)] uppercase'
        id='cluster-representative-heading'
      >
        대표 기사
      </h2>
      <p className='m-0 mb-2 text-[14.5px] font-semibold text-[color:var(--text)]'>
        {representative.title}
      </p>
      <div className='mono mb-3 flex flex-col gap-0.5 text-[11.5px] text-[color:var(--text-faint)]'>
        <span>{displaySource(representative.source)}</span>
        <span>{displayPublishedAt(representative.publishedAt)}</span>
        {representative.sourceSummary ? (
          <span className='font-sans text-[13.5px] text-[color:var(--text-soft)]'>
            {representative.sourceSummary}
          </span>
        ) : null}
      </div>
      {/* C8: design shows the two actions as inline auto-width buttons side
          by side, not stacked full-width. */}
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
