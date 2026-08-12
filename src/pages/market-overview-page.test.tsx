import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '../lib/capabilities';
import type { MarketSnapshot } from '../lib/view-models';
import { MarketOverviewPage } from './market-overview-page';

// This suite renders the real component tree with a plain `snapshot` prop —
// it never wired up a QueryClientProvider. `useAdjacentSnapshotDates` (used
// for the Archive Detail prev/next band) now goes through react-query, so it
// is mocked here rather than dragging query-client plumbing into every case,
// none of which assert on the band's prev/next labels.
vi.mock('./market-overview/use-adjacent-snapshot-dates', () => ({
  useAdjacentSnapshotDates: () => ({
    previous: null,
    next: null,
    isLoading: false,
  }),
}));

/**
 * The pre-rebuild version of this file asserted on the old card-grid layout
 * (`Source View`/`Detail View` links) — that structure no longer exists, so
 * every case below is new, covering the acceptance list from the task brief:
 * index table values + ≤640px high/low subline survival, the PARTIAL banner's
 * per-market messages, the `articleLinks` toggle's `aria-expanded` contract,
 * the null-`globalHeadline` fallback copy, the `markets:[]` empty state, and
 * a non-admin user not receiving the ops-navigation button.
 */

const FIXED_NOW = new Date('2026-03-17T10:00:00+09:00');

function buildSnapshot(
  overrides: Partial<MarketSnapshot> = {}
): MarketSnapshot {
  return {
    pageId: 501,
    businessDate: '2026-03-17',
    versionNo: 3,
    generatedAt: '2026. 03. 17. 09:30',
    generatedAtIso: '2026-03-17T09:30:00',
    status: 'ready',
    globalHeadline: '연준 발언에 기술주 랠리, 반도체 지수 강세',
    partialMessage: null,
    metadata: {
      rawNewsCount: 174,
      processedNewsCount: 114,
      clusterCount: 21,
      lastUpdatedAt: '2026-03-17 09:31 KST',
      isLatest: null,
    },
    markets: [
      {
        label: '미국 증시',
        marketType: 'US',
        summaryTitle: '기술주 강세',
        summaryBody: '연준 발언 이후 나스닥이 강세로 마감했습니다.',
        indices: [
          {
            label: 'S&P 500',
            code: null,
            value: '5,499.80',
            change: '+12.34',
            changeRate: '+0.23%',
            direction: 'up',
            high: '5,499.80',
            low: '5,455.22',
          },
        ],
        clusters: [],
        analysis: { background: [], keyThemes: [], outlook: null },
        articleLinks: [],
        metadata: {
          rawNewsCount: 85,
          processedNewsCount: 26,
          clusterCount: 7,
          lastUpdatedAt: '2026-03-17 09:31 KST',
          partialMessage: null,
          sourceDate: null,
          expectedSessionDate: null,
        },
      },
    ],
    ...overrides,
  };
}

afterEach(() => {
  resetRoleOverrideForTesting();
  window.history.replaceState(null, '', '/');
});

describe('MarketOverviewPage — 대표 지수 표', () => {
  it('renders index values and keeps 고가/저가 as a subline for the ≤640px collapse', () => {
    render(
      <MarketOverviewPage
        mode='latest'
        now={FIXED_NOW}
        snapshot={buildSnapshot()}
      />
    );

    // "S&P 500" legitimately renders twice — once in the desktop index
    // table (CSS-hidden below 640px via `hidden sm:block`), once in the
    // mobile index cards (CSS-hidden above via `sm:hidden`) — both mount
    // unconditionally, so this asserts presence via `getAllByText` rather
    // than the single-match `getByText`.
    expect(screen.getAllByText('S&P 500').length).toBeGreaterThan(0);
    // "+12.34"/"+0.23%" render in both the desktop table and the mobile
    // cards for the same reason — assert presence, not a single match.
    expect(screen.getAllByText('+12.34').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+0.23%').length).toBeGreaterThan(0);
    // The 고가/저가 columns are hidden below 640px with `sm:hidden`/
    // `sm:table-cell` (CSS-only), never unmounted — this subline node must
    // exist in the DOM regardless of viewport, with the same values exposed
    // in the priority row's supporting line.
    expect(screen.getByText('고 5,499.80 · 저 5,455.22')).toBeInTheDocument();
  });
});

describe('MarketOverviewPage — 시장 탭', () => {
  function twoMarketSnapshot(overrides: Partial<MarketSnapshot> = {}) {
    const base = buildSnapshot();

    return buildSnapshot({
      markets: [
        base.markets[0],
        {
          ...base.markets[0],
          label: '한국 증시',
          marketType: 'KR',
        },
      ],
      ...overrides,
    });
  }

  it('renders only the selected market panel, and switching tabs updates the panel and ?market=', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/market/latest');

    render(
      <MarketOverviewPage
        mode='latest'
        now={FIXED_NOW}
        snapshot={twoMarketSnapshot()}
      />
    );

    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: '미국 증시' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: '한국 증시' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /한국 증시/ }));

    expect(window.location.search).toBe('?market=kr');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: '한국 증시' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: '미국 증시' })
    ).not.toBeInTheDocument();
  });

  it('reads ?market=kr from the URL on mount and selects the matching tab', () => {
    window.history.replaceState(null, '', '/market/latest?market=kr');

    render(
      <MarketOverviewPage
        mode='latest'
        now={FIXED_NOW}
        snapshot={twoMarketSnapshot()}
      />
    );

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
      '한국 증시'
    );
    expect(
      screen.getByRole('heading', { level: 2, name: '한국 증시' })
    ).toBeInTheDocument();
  });

  it('falls back to the first market when ?market= does not match any marketType', () => {
    window.history.replaceState(null, '', '/market/latest?market=jp');

    render(
      <MarketOverviewPage
        mode='latest'
        now={FIXED_NOW}
        snapshot={twoMarketSnapshot()}
      />
    );

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
      '미국 증시'
    );
  });

  // `marketType` is nullable in the mapper, so a market can have no code to
  // put in the URL. The writer falls back to the array position; the reader
  // has to accept that same value or such a market silently reverts to the
  // first tab on reload.
  it('round-trips a market that has no marketType through the URL', async () => {
    const user = userEvent.setup();
    const snapshot = twoMarketSnapshot();
    snapshot.markets[1].marketType = null;

    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    await user.click(screen.getByRole('tab', { name: /한국 증시/ }));

    expect(window.location.search).toBe('?market=1');

    cleanup();
    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
      '한국 증시'
    );
  });

  // Regression for the Archive Detail return-state contract: `extractFilterQuery`
  // (navigation.ts) reads `from`/`to`/`status`/`page` off the URL, and
  // Archive Detail only renders "검색 결과로 돌아가기" when that returns
  // non-null. Adding `?market=` on a tab switch must not drop those four
  // params, or the return link would silently disappear.
  it('preserves from/to/status/page (the archive return-state contract) when switching tabs', async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      '',
      '/market/archive/2026-03-17?from=2026-01-01&to=2026-01-05&status=FAILED&page=2'
    );

    render(
      <MarketOverviewPage
        mode='archive'
        now={FIXED_NOW}
        snapshot={twoMarketSnapshot({ businessDate: '2026-03-17' })}
      />
    );

    expect(
      screen.getByRole('button', { name: '검색 결과로 돌아가기' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /한국 증시/ }));

    expect(window.location.search).toBe(
      '?from=2026-01-01&to=2026-01-05&status=FAILED&page=2&market=kr'
    );
    expect(
      screen.getByRole('button', { name: '검색 결과로 돌아가기' })
    ).toBeInTheDocument();
  });
});

describe('MarketOverviewPage — PARTIAL 배너', () => {
  it('admin: shows the raw page-level message and each market’s missing-data detail', () => {
    const snapshot = buildSnapshot({
      status: 'partial',
      partialMessage: '한국 증시 섹션이 일부 누락된 상태로 생성됐습니다.',
    });
    const baseMetadata = snapshot.markets[0].metadata;
    if (!baseMetadata) {
      throw new Error('buildSnapshot fixture must define market metadata');
    }
    snapshot.markets[0] = {
      ...snapshot.markets[0],
      metadata: {
        ...baseMetadata,
        partialMessage: '뉴스 수집이 지연되어 일부 기사가 누락됐습니다.',
      },
    };

    setRoleOverride('admin');
    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText('이 브리프는 일부 데이터가 누락된 상태로 생성됐습니다')
    ).toBeInTheDocument();
    expect(
      screen.getByText('한국 증시 섹션이 일부 누락된 상태로 생성됐습니다.')
    ).toBeInTheDocument();
    // The market-level detail now lives in the "상세 정보" description
    // list as separate 영향받은 시장/누락된 데이터 fields instead of a
    // single concatenated "시장명 — 메시지" line.
    expect(screen.getAllByText('미국 증시').length).toBeGreaterThan(0);
    // This message also renders inline in the market section's own notice
    // (unrelated to the banner), so it legitimately appears twice.
    expect(
      screen.getAllByText('뉴스 수집이 지연되어 일부 기사가 누락됐습니다.')
        .length
    ).toBeGreaterThan(0);
    // The market fixture has no sourceDate, so the detail falls back to the
    // "확인되지 않음" placeholder rather than showing an empty value.
    expect(screen.getByText('확인되지 않음')).toBeInTheDocument();
  });

  it('user: shows the reference-only copy and market detail, without the raw batch message', () => {
    const snapshot = buildSnapshot({
      status: 'partial',
      partialMessage: '한국 증시 섹션이 일부 누락된 상태로 생성됐습니다.',
    });
    const baseMetadata = snapshot.markets[0].metadata;
    if (!baseMetadata) {
      throw new Error('buildSnapshot fixture must define market metadata');
    }
    snapshot.markets[0] = {
      ...snapshot.markets[0],
      metadata: {
        ...baseMetadata,
        partialMessage: '뉴스 수집이 지연되어 일부 기사가 누락됐습니다.',
      },
    };

    setRoleOverride('user');
    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText('일부 데이터가 누락된 브리프입니다')
    ).toBeInTheDocument();
    expect(screen.getByText(/참고용/)).toBeInTheDocument();
    // The raw batch-facing page-level message must not leak to regular users.
    expect(
      screen.queryByText('한국 증시 섹션이 일부 누락된 상태로 생성됐습니다.')
    ).not.toBeInTheDocument();
    // The structured missing-market detail is still available to everyone.
    expect(screen.getAllByText('미국 증시').length).toBeGreaterThan(0);
    // The raw per-market message still renders once, inline in the market
    // section's own notice (a separate, accepted exception — tracked as
    // backend dependency D-13 — unrelated to the banner). The banner's own
    // "상세 정보" details row must NOT repeat it for a regular user: it
    // shows a neutral label there instead.
    expect(
      screen.getAllByText('뉴스 수집이 지연되어 일부 기사가 누락됐습니다.')
    ).toHaveLength(1);
    expect(
      screen.getByText('이 시장의 데이터 일부가 누락되었습니다.')
    ).toBeInTheDocument();
  });

  it('gates "배치 운영에서 원인 보기" on can(\'ops.view\') — a non-admin user must not see it', () => {
    const snapshot = buildSnapshot({ status: 'partial' });

    setRoleOverride('user');
    const { rerender } = render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );
    expect(
      screen.queryByRole('button', { name: '배치 운영에서 원인 보기' })
    ).not.toBeInTheDocument();

    setRoleOverride('admin');
    rerender(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );
    expect(
      screen.getByRole('button', { name: '배치 운영에서 원인 보기' })
    ).toBeInTheDocument();
  });
});

describe('MarketOverviewPage — 근거 원문', () => {
  it('keeps the lower evidence block separate from row source actions', () => {
    const rowOriginalUrl = 'https://example.com/row-original';
    const snapshot = buildSnapshot();
    snapshot.markets[0] = {
      ...snapshot.markets[0],
      clusters: [
        {
          id: 'cluster-1',
          articleCount: 1,
          title: '대표 이슈',
          summary: '대표 이슈 요약',
          tags: [],
          representativeArticle: {
            title: '대표 기사',
            source: '한국경제',
            publishedAt: '2026-03-17 08:00 KST',
            originalUrl: rowOriginalUrl,
            mirrorUrl: null,
          },
        },
      ],
      articleLinks: [
        {
          id: 'evidence-1',
          clusterId: 'cluster-1',
          clusterTitle: '대표 이슈',
          title: '근거 기사',
          source: '한국경제',
          publishedAt: '2026-03-17 08:00 KST',
          originalUrl: 'https://example.com/evidence',
          mirrorUrl: null,
        },
      ],
    };

    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByRole('heading', { name: '근거 원문' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '근거 기사 ↗' })).toHaveAttribute(
      'href',
      'https://example.com/evidence'
    );
    expect(
      screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href') === rowOriginalUrl)
    ).toHaveLength(1);
  });

  it('toggles aria-expanded and reveals links beyond the first 4', async () => {
    const user = userEvent.setup();
    const snapshot = buildSnapshot();
    snapshot.markets[0] = {
      ...snapshot.markets[0],
      articleLinks: Array.from({ length: 5 }, (_, index) => ({
        id: `link-${index}`,
        clusterId: null,
        clusterTitle: null,
        title: `기사 제목 ${index + 1}`,
        source: '매일경제',
        publishedAt: '2026-03-17 08:00 KST',
        originalUrl: `https://example.com/${index}`,
        mirrorUrl: null,
      })),
    };

    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    const toggle = screen.getByRole('button', { name: '전체 5건 보기' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/기사 제목 5/)).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole('button', { name: '접기' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText(/기사 제목 5/)).toBeInTheDocument();
  });
});

describe('MarketOverviewPage — 글로벌 헤드라인', () => {
  it('renders the regular-user fallback copy when there is no headline', () => {
    const snapshot = buildSnapshot({ globalHeadline: '' });

    setRoleOverride('user');
    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText(
        '오늘의 헤드라인이 아직 준비되지 않았습니다. 아래 시장별 지수와 이슈는 그대로 확인할 수 있습니다.'
      )
    ).toBeInTheDocument();
  });

  it('renders the operator fallback copy when there is no headline', () => {
    const snapshot = buildSnapshot({ globalHeadline: '' });

    setRoleOverride('admin');
    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText(
        '글로벌 헤드라인이 생성되지 않았습니다. AI 요약 단계가 실패했을 수 있습니다 — 아래 상태와 배치 로그에서 원인을 확인하세요.'
      )
    ).toBeInTheDocument();
  });

  it('promotes the headline to the focusable #page-title h1, demoting the mode label to a small caption', () => {
    render(
      <MarketOverviewPage
        mode='latest'
        now={FIXED_NOW}
        snapshot={buildSnapshot()}
      />
    );

    const h1 = screen.getByRole('heading', {
      level: 1,
      name: '연준 발언에 기술주 랠리, 반도체 지수 강세',
    });
    expect(h1).toHaveAttribute('id', 'page-title');
    expect(h1).toHaveAttribute('tabindex', '-1');
    // The old h1 copy ("최신 시장 브리프") now renders as a small caption
    // above the headline, not as a heading.
    expect(
      screen.queryByRole('heading', { name: '최신 시장 브리프' })
    ).toBeNull();
    expect(screen.getByText('최신 시장 브리프')).toBeInTheDocument();
  });
});

describe('MarketOverviewPage — 데이터 정보', () => {
  it('moves pageId/versionNo/pipeline counts into a collapsed 데이터 정보 block at the bottom of the page', () => {
    render(
      <MarketOverviewPage
        mode='latest'
        now={FIXED_NOW}
        snapshot={buildSnapshot()}
      />
    );

    const details = screen.getByText('데이터 정보').closest('details');
    expect(details).not.toBeNull();
    // Collapsed by default so it never competes with the conclusion above it.
    expect(details).not.toHaveAttribute('open');

    expect(details).toHaveTextContent(
      '원문 174건 → 정제 114건 → 클러스터 21건'
    );
    expect(details).toHaveTextContent('pageId 501 · v3');
    expect(details).toHaveTextContent('마지막 갱신 2026-03-17 09:31 KST');
  });
});

describe('MarketOverviewPage — markets:[] 빈 상태', () => {
  // `EmptyMarketsPanel`'s reason text now routes through
  // `emptyMarketsReasonCopy` (`src/lib/audience-copy.ts`), so FAILED/non-FAILED
  // and admin/user are each asserted against the copy that audience should
  // actually see — not the operator-only raw text regardless of role, which
  // is the bug this suite used to (unknowingly) assert as correct.
  it('shows a plain-language reason and hides the ops action for a non-admin user (FAILED)', () => {
    const snapshot = buildSnapshot({ status: 'failed', markets: [] });

    setRoleOverride('user');
    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText('시장 섹션이 생성되지 않았습니다')
    ).toBeInTheDocument();
    expect(
      screen.getByText('이 날짜의 브리프가 생성되지 못했습니다.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        '이 날짜의 배치가 뉴스 수집 단계에서 실패해 시장 섹션이 생성되지 않았습니다.'
      )
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '배치 상태 확인' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '다른 날짜 찾기' })
    ).toBeInTheDocument();
  });

  it('shows the FAILED-specific batch/collection reason to an admin', () => {
    const snapshot = buildSnapshot({ status: 'failed', markets: [] });

    setRoleOverride('admin');
    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText(
        '이 날짜의 배치가 뉴스 수집 단계에서 실패해 시장 섹션이 생성되지 않았습니다.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '배치 상태 확인' })
    ).toBeInTheDocument();
  });

  it('shows the non-FAILED reason and the ops action for an admin', () => {
    const snapshot = buildSnapshot({ status: 'ready', markets: [] });

    setRoleOverride('admin');
    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText(
        '배치는 완료됐지만 시장 섹션이 비어 있습니다. 수집 결과가 0건이었을 수 있습니다.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '배치 상태 확인' })
    ).toBeInTheDocument();
  });

  it('shows a plain-language non-FAILED reason to a non-admin user and hides the ops action', () => {
    const snapshot = buildSnapshot({ status: 'ready', markets: [] });

    setRoleOverride('user');
    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText('이 날짜에 표시할 시장 데이터가 없습니다.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        '배치는 완료됐지만 시장 섹션이 비어 있습니다. 수집 결과가 0건이었을 수 있습니다.'
      )
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '배치 상태 확인' })
    ).not.toBeInTheDocument();
  });
});
