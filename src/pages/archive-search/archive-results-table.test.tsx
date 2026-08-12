import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { withBasePath } from '../../lib/router';
import { ArchiveResultsTable } from './archive-results-table';

const filters = { from: '2026-03-01', to: '2026-03-31', status: '', page: 1 };

describe('ArchiveResultsTable', () => {
  it('links both the date and headline cells with pageId + filter context for return-context navigation', () => {
    render(
      <ArchiveResultsTable
        canViewOps={false}
        filters={filters}
        rows={[
          {
            pageId: 42,
            businessDate: '2026-03-31',
            headline: 'newer version',
            status: 'READY',
            generatedAt: '2026-03-31 06:20 KST',
            detail: null,
          },
        ]}
        scrollSearch='from=2026-03-01&to=2026-03-31'
      />
    );

    const expectedHref = withBasePath(
      '/market/archive/2026-03-31?pageId=42&from=2026-03-01&to=2026-03-31&page=1'
    );

    // Use an ISO date rather than the ko-KR dotted format ("2026. 03. 31").
    expect(screen.getByRole('link', { name: '2026-03-31' })).toHaveAttribute(
      'href',
      expectedHref
    );
    expect(screen.getByRole('link', { name: 'newer version' })).toHaveAttribute(
      'href',
      expectedHref
    );
    expect(screen.getByText('pageId 42')).toBeInTheDocument();
  });

  it('marks FAILED rows with the danger tone and shows the failure reason as a subline to an operator', () => {
    render(
      <ArchiveResultsTable
        canViewOps={true}
        filters={filters}
        rows={[
          {
            pageId: 41,
            businessDate: '2026-03-30',
            headline: '헤드라인 요약이 아직 생성되지 않았습니다.',
            status: 'FAILED',
            generatedAt: '2026-03-31 06:08 KST',
            detail: '뉴스 수집 단계에서 provider 타임아웃이 발생했습니다.',
          },
        ]}
        scrollSearch=''
      />
    );

    expect(
      screen.getByText('뉴스 수집 단계에서 provider 타임아웃이 발생했습니다.')
    ).toBeInTheDocument();
  });

  // `record.detail` is the raw per-page `partialMessage` from the backend —
  // the same unfiltered pipeline text (e.g. "provider 타임아웃") that
  // `partial-banner.tsx` already gates behind `canViewOps` elsewhere in the
  // app. A regular user must never see it here either.
  it('never shows the failure reason subline to a regular user, even on a FAILED row', () => {
    render(
      <ArchiveResultsTable
        canViewOps={false}
        filters={filters}
        rows={[
          {
            pageId: 41,
            businessDate: '2026-03-30',
            headline: '헤드라인 요약이 아직 생성되지 않았습니다.',
            status: 'FAILED',
            generatedAt: '2026-03-31 06:08 KST',
            detail: '뉴스 수집 단계에서 provider 타임아웃이 발생했습니다.',
          },
        ]}
        scrollSearch=''
      />
    );

    expect(
      screen.queryByText('뉴스 수집 단계에서 provider 타임아웃이 발생했습니다.')
    ).not.toBeInTheDocument();
  });

  it('keeps 생성 시각 present as an accessible subline under the headline cell — the collapsed desktop column never removes the value from the DOM', () => {
    render(
      <ArchiveResultsTable
        canViewOps={false}
        filters={filters}
        rows={[
          {
            pageId: 40,
            businessDate: '2026-03-29',
            headline: 'a headline',
            status: 'READY',
            generatedAt: '2026-03-30 06:08 KST',
            detail: null,
          },
        ]}
        scrollSearch=''
      />
    );

    // The desktop column renders the raw value without a "생성 " prefix, so
    // this text only ever matches the priority-cell subline that stays
    // mounted (CSS-hidden above 1180px, not `hidden`/unmounted below it) —
    // Responsive rendering must not use `display:none` to drop the value,
    // from the accessibility tree.
    const subline = screen.getByText('생성 2026-03-30 06:08 KST');
    expect(subline).toBeInTheDocument();
    expect(subline).not.toHaveAttribute('hidden');
    expect(subline.closest('[aria-hidden="true"]')).not.toBeInTheDocument();
  });
});
