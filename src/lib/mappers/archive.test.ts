import { describe, expect, it } from 'vitest';
import { mapArchiveListToView } from './archive';

describe('mappers - archive', () => {
  it('maps archive pagination into table rows', () => {
    const view = mapArchiveListToView({
      items: [
        {
          pageId: 1,
          businessDate: '2026-03-31',
          pageTitle: 'Title',
          headlineSummary: null,
          status: 'READY',
          generatedAt: '2026-03-31T06:12:00Z',
          partialMessage: null,
        },
      ],
      pagination: {
        page: 2,
        size: 10,
        totalCount: 21,
      },
    });

    expect(view.page).toBe(2);
    expect(view.totalPages).toBe(3);
    // A null `headlineSummary` no longer backfills with `pageTitle` — a
    // FAILED (AI-summary-failed) row must not look like a normal one.
    expect(view.rows[0].headline).toBe('헤드라인이 생성되지 않았습니다');
  });

  it('normalizes malformed archive item dates, text, status, and counts', () => {
    const view = mapArchiveListToView({
      items: [
        {
          pageId: { id: 1 },
          businessDate: { date: '2026-03-31' },
          pageTitle: { text: 'Title' },
          headlineSummary: { text: 'Headline' },
          status: { value: 'READY' },
          generatedAt: { iso: '2026-03-31T06:12:00Z' },
          partialMessage: { text: 'partial' },
        },
      ],
      pagination: {
        page: { value: 2 },
        size: { value: 10 },
        totalCount: { value: 21 },
      },
    } as unknown as Parameters<typeof mapArchiveListToView>[0]);

    expect(view).toMatchObject({
      page: 1,
      size: 1,
      totalCount: 0,
      totalPages: 1,
    });
    expect(view.rows[0]).toMatchObject({
      pageId: 0,
      businessDate: '-',
      headline: '헤드라인이 생성되지 않았습니다',
      status: 'FAILED',
      generatedAt: '-',
      detail: null,
    });
  });
});
