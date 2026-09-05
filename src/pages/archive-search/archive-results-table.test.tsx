import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { withBasePath } from '@/lib/router';
import { ArchiveResultsTable } from '@/pages/archive-search/archive-results-table';

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
    // 2026-03-31 is a Tuesday (화) — the weekday suffix rides in the same
    // link, right after the ISO date.
    expect(
      screen.getByRole('link', { name: '2026-03-31 (화)' })
    ).toHaveAttribute('href', expectedHref);
    expect(screen.getByRole('link', { name: 'newer version' })).toHaveAttribute(
      'href',
      expectedHref
    );
    // `pageId`는 내부 식별자다 — 운영자에게만 보인다.
    expect(screen.queryByText('pageId 42')).not.toBeInTheDocument();
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
    expect(screen.getAllByRole('row').at(-1)).not.toHaveClass(
      'shadow-[inset_3px_0_0_var(--danger)]'
    );
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

  it('splits a page that spans a month boundary into two groups with correct counts, in arrival order', () => {
    render(
      <ArchiveResultsTable
        canViewOps={false}
        filters={filters}
        rows={[
          {
            pageId: 50,
            businessDate: '2026-08-05',
            headline: 'aug row 2',
            status: 'READY',
            generatedAt: '2026-08-05 06:00 KST',
            detail: null,
          },
          {
            pageId: 49,
            businessDate: '2026-08-01',
            headline: 'aug row 1',
            status: 'READY',
            generatedAt: '2026-08-01 06:00 KST',
            detail: null,
          },
          {
            pageId: 48,
            businessDate: '2026-07-31',
            headline: 'jul row',
            status: 'READY',
            generatedAt: '2026-07-31 06:00 KST',
            detail: null,
          },
        ]}
        scrollSearch=''
      />
    );

    // `th[scope='colgroup']` maps to the `columnheader` role — this is the
    // selector another agent would reach for from e2e.
    const groupHeaders = screen.getAllByRole('columnheader', {
      name: /년 \d+월/,
    });
    expect(groupHeaders).toHaveLength(2);
    expect(groupHeaders[0]).toHaveTextContent('2026년 8월');
    expect(groupHeaders[0]).toHaveTextContent('2건');
    expect(groupHeaders[0]).toHaveAttribute('scope', 'colgroup');
    expect(groupHeaders[1]).toHaveTextContent('2026년 7월');
    expect(groupHeaders[1]).toHaveTextContent('1건');

    // Rows stay in arrival (businessDate-descending) order within and
    // across groups — grouping must not re-sort.
    const rows = screen.getAllByRole('row');
    const rowTexts = rows.map((row) => row.textContent ?? '');
    expect(
      rowTexts.findIndex((text) => text.includes('2026년 8월'))
    ).toBeLessThan(rowTexts.findIndex((text) => text.includes('aug row 2')));
    expect(
      rowTexts.findIndex((text) => text.includes('aug row 2'))
    ).toBeLessThan(rowTexts.findIndex((text) => text.includes('aug row 1')));
    expect(
      rowTexts.findIndex((text) => text.includes('aug row 1'))
    ).toBeLessThan(rowTexts.findIndex((text) => text.includes('2026년 7월')));
    expect(
      rowTexts.findIndex((text) => text.includes('2026년 7월'))
    ).toBeLessThan(rowTexts.findIndex((text) => text.includes('jul row')));
  });

  it('still renders a group header when a page has only one month — the count is useful on its own', () => {
    render(
      <ArchiveResultsTable
        canViewOps={false}
        filters={filters}
        rows={[
          {
            pageId: 60,
            businessDate: '2026-05-10',
            headline: 'only row',
            status: 'READY',
            generatedAt: '2026-05-10 06:00 KST',
            detail: null,
          },
        ]}
        scrollSearch=''
      />
    );

    const groupHeader = screen.getByRole('columnheader', {
      name: /년 \d+월/,
    });
    expect(groupHeader).toHaveTextContent('2026년 5월');
    expect(groupHeader).toHaveTextContent('1건');
  });

  it('suffixes the date link with the correct KST weekday, with no off-by-one at a month boundary', () => {
    render(
      <ArchiveResultsTable
        canViewOps={false}
        filters={filters}
        rows={[
          {
            pageId: 70,
            businessDate: '2026-08-01',
            headline: 'month-boundary row',
            status: 'READY',
            generatedAt: '2026-08-01 06:00 KST',
            detail: null,
          },
        ]}
        scrollSearch=''
      />
    );

    // 2026-08-01 is a Saturday (토). Parsing this as a naive local/UTC
    // `Date` at the wrong offset would drift to Friday (금) or Sunday (일).
    expect(
      screen.getByRole('link', { name: 'month-boundary row' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '2026-08-01 (토)' })
    ).toBeInTheDocument();
  });

  it('keeps pageId and the failure-reason subline out of the DOM for a regular user even across grouped months', () => {
    render(
      <ArchiveResultsTable
        canViewOps={false}
        filters={filters}
        rows={[
          {
            pageId: 81,
            businessDate: '2026-08-01',
            headline: 'aug row',
            status: 'FAILED',
            generatedAt: '2026-08-01 06:00 KST',
            detail: '뉴스 수집 단계에서 provider 타임아웃이 발생했습니다.',
          },
          {
            pageId: 80,
            businessDate: '2026-07-30',
            headline: 'jul row',
            status: 'FAILED',
            generatedAt: '2026-07-30 06:00 KST',
            detail: '지수 provider 응답이 지연되었습니다.',
          },
        ]}
        scrollSearch=''
      />
    );

    expect(screen.queryByText(/pageId \d+/)).not.toBeInTheDocument();
    expect(
      screen.queryByText('뉴스 수집 단계에서 provider 타임아웃이 발생했습니다.')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('지수 provider 응답이 지연되었습니다.')
    ).not.toBeInTheDocument();
  });

  describe('month group header', () => {
    it('exposes a button named "2026년 7월만 보기" (count excluded) and invokes onSelectMonth with the month range', () => {
      const onSelectMonth = vi.fn();
      // A past month: the natural last day (2026-07-31) is not in the
      // future, so no clamping applies here.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-06T00:00:00+09:00'));

      try {
        render(
          <ArchiveResultsTable
            canViewOps={false}
            filters={filters}
            onSelectMonth={onSelectMonth}
            rows={[
              {
                pageId: 90,
                businessDate: '2026-07-15',
                headline: 'jul row',
                status: 'READY',
                generatedAt: '2026-07-15 06:00 KST',
                detail: null,
              },
            ]}
            scrollSearch=''
          />
        );

        const button = screen.getByRole('button', {
          name: '2026년 7월만 보기',
        });
        expect(button).not.toHaveTextContent('건');

        fireEvent.click(button);

        expect(onSelectMonth).toHaveBeenCalledWith({
          from: '2026-07-01',
          to: '2026-07-31',
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it("clamps a current-month group's `to` to today instead of the month's natural last day", () => {
      const onSelectMonth = vi.fn();
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-06T00:00:00+09:00'));

      try {
        render(
          <ArchiveResultsTable
            canViewOps={false}
            filters={filters}
            onSelectMonth={onSelectMonth}
            rows={[
              {
                pageId: 91,
                businessDate: '2026-09-01',
                headline: 'sep row',
                status: 'READY',
                generatedAt: '2026-09-01 06:00 KST',
                detail: null,
              },
            ]}
            scrollSearch=''
          />
        );

        fireEvent.click(
          screen.getByRole('button', { name: '2026년 9월만 보기' })
        );

        expect(onSelectMonth).toHaveBeenCalledWith({
          from: '2026-09-01',
          to: '2026-09-06',
        });
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
