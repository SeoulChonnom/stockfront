import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getNavigation } from '../lib/api/pages';
import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '../lib/capabilities';
import type { MarketSnapshot } from '../lib/view-models';
import { MarketOverviewPage } from './market-overview-page';

// B-5: `MarketOverviewPage` always has an already-loaded daily-page
// response, so its prev/next band reads `snapshot.navigation` directly —
// it must never call the standalone `GET /pages/navigation` endpoint (that
// path belongs only to the no-page-loaded routes: `market-overview-route-shell.tsx`,
// `archive-not-found-state.tsx`). Spying on `getNavigation` here (rather
// than mocking a hook) proves this component genuinely has no code path
// that reaches the network client for it.
vi.mock('../lib/api/pages', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/pages')>();
  return {
    ...actual,
    getNavigation: vi.fn(actual.getNavigation),
  };
});

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

/** A valid B-1 keyPoints triplet in the server-guaranteed order. */
const SAMPLE_KEY_POINTS: MarketSnapshot['keyPoints'] = [
  {
    kind: 'direction',
    label: '시장 방향',
    text: '미국 증시는 상승했지만 한국 증시는 하락해 시장별 흐름이 엇갈렸습니다.',
    direction: 'MIXED',
  },
  {
    kind: 'driver',
    label: '주요 원인',
    text: '금리 인하 기대와 국내 반도체주 약세가 주요 변동 요인이었습니다.',
  },
  {
    kind: 'watch',
    label: '관전 포인트',
    text: '미국 물가 지표와 외국인의 반도체주 수급을 확인할 필요가 있습니다.',
  },
];

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
    keyPoints: SAMPLE_KEY_POINTS,
    issues: [],
    navigation: { previousBusinessDate: null, nextBusinessDate: null },
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
  vi.mocked(getNavigation).mockClear();
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

describe('MarketOverviewPage — B-5 인접 영업일 (snapshot.navigation)', () => {
  it('중간 날짜: both prev/next enabled with the real dates, and never calls GET /pages/navigation', () => {
    const snapshot = buildSnapshot({
      navigation: {
        previousBusinessDate: '2026-03-16',
        nextBusinessDate: '2026-03-18',
      },
    });

    render(
      <MarketOverviewPage mode='archive' now={FIXED_NOW} snapshot={snapshot} />
    );

    const prevButton = screen.getByRole('button', { name: '이전 2026-03-16' });
    const nextButton = screen.getByRole('button', { name: '다음 2026-03-18' });
    expect(prevButton).toBeEnabled();
    expect(nextButton).toBeEnabled();
    expect(getNavigation).not.toHaveBeenCalled();
  });

  it('가장 오래된 날짜: prev is null, so only the prev button is disabled', () => {
    const snapshot = buildSnapshot({
      navigation: {
        previousBusinessDate: null,
        nextBusinessDate: '2026-03-18',
      },
    });

    render(
      <MarketOverviewPage mode='archive' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByRole('button', { name: '이전 브리프 없음' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '다음 2026-03-18' })
    ).toBeEnabled();
  });

  it('최신 날짜: next is null, so only the next button is disabled', () => {
    const snapshot = buildSnapshot({
      navigation: {
        previousBusinessDate: '2026-03-16',
        nextBusinessDate: null,
      },
    });

    render(
      <MarketOverviewPage mode='archive' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByRole('button', { name: '이전 2026-03-16' })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: '다음 브리프 없음' })
    ).toBeDisabled();
  });

  it('양쪽 null: both buttons disabled without ever calling the standalone endpoint', () => {
    const snapshot = buildSnapshot({
      navigation: { previousBusinessDate: null, nextBusinessDate: null },
    });

    render(
      <MarketOverviewPage mode='archive' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByRole('button', { name: '이전 브리프 없음' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '다음 브리프 없음' })
    ).toBeDisabled();
    expect(getNavigation).not.toHaveBeenCalled();
  });
});

describe('MarketOverviewPage — B-1 오늘의 핵심 (keyPoints)', () => {
  it('성공 3개 정상 순서: renders direction → driver → watch with server-fixed labels visible as text', () => {
    render(
      <MarketOverviewPage
        mode='latest'
        now={FIXED_NOW}
        snapshot={buildSnapshot()}
      />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: '오늘의 핵심' })
    ).toBeInTheDocument();

    // Labels are the server's fixed strings, never FE-synthesized copy.
    expect(screen.getByText('시장 방향')).toBeInTheDocument();
    expect(screen.getByText('주요 원인')).toBeInTheDocument();
    expect(screen.getByText('관전 포인트')).toBeInTheDocument();

    expect(
      screen.getByText(
        '미국 증시는 상승했지만 한국 증시는 하락해 시장별 흐름이 엇갈렸습니다.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '금리 인하 기대와 국내 반도체주 약세가 주요 변동 요인이었습니다.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '미국 물가 지표와 외국인의 반도체주 수급을 확인할 필요가 있습니다.'
      )
    ).toBeInTheDocument();
  });

  it.each([
    ['UP', '상승'],
    ['DOWN', '하락'],
    ['MIXED', '혼조'],
    ['FLAT', '보합'],
  ] as const)(
    'direction %s는 색·아이콘뿐 아니라 눈에 보이는 단어(%s)로도 표현된다',
    (direction, word) => {
      render(
        <MarketOverviewPage
          mode='latest'
          now={FIXED_NOW}
          snapshot={buildSnapshot({
            keyPoints: [
              {
                kind: 'direction',
                label: SAMPLE_KEY_POINTS[0].label,
                text: SAMPLE_KEY_POINTS[0].text,
                direction,
              },
              SAMPLE_KEY_POINTS[1],
              SAMPLE_KEY_POINTS[2],
            ],
          })}
        />
      );

      // Scoped to the keyPoints section: the index table elsewhere on the
      // page renders its own "상승"/"하락" sr-only text for `changeValue`
      // direction (a different enum, `up`/`down`/`none`), which would
      // otherwise collide with this assertion.
      const section = screen
        .getByRole('heading', { level: 2, name: '오늘의 핵심' })
        .closest('section');
      expect(section).not.toBeNull();
      expect(
        within(section as HTMLElement).getByText(word)
      ).toBeInTheDocument();
    }
  );

  it('[] 미표시: keyPoints가 비면 제목을 포함한 섹션 전체가 렌더되지 않는다 (빈 heading landmark 금지)', () => {
    render(
      <MarketOverviewPage
        mode='latest'
        now={FIXED_NOW}
        snapshot={buildSnapshot({ keyPoints: [] })}
      />
    );

    expect(
      screen.queryByRole('heading', { name: '오늘의 핵심' })
    ).not.toBeInTheDocument();
  });

  it('헤드라인 실패 + keyPoints 성공: globalHeadline이 null이어도 블록은 그대로 렌더된다', () => {
    render(
      <MarketOverviewPage
        mode='latest'
        now={FIXED_NOW}
        snapshot={buildSnapshot({ globalHeadline: null })}
      />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: '오늘의 핵심' })
    ).toBeInTheDocument();
  });

  it('헤드라인 성공 + keyPoints 실패: PARTIAL 배너에 KEY_POINTS_GENERATION_FAILED 안내가 뜨고 섹션은 숨는다', () => {
    render(
      <MarketOverviewPage
        mode='latest'
        now={FIXED_NOW}
        snapshot={buildSnapshot({
          status: 'partial',
          keyPoints: [],
          issues: [
            {
              category: 'AI_SUMMARY',
              code: 'KEY_POINTS_GENERATION_FAILED',
              message: '오늘의 핵심 포인트를 준비하지 못했습니다.',
            },
          ],
        })}
      />
    );

    expect(
      screen.queryByRole('heading', { name: '오늘의 핵심' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('오늘의 핵심 포인트를 준비하지 못했습니다.')
    ).toBeInTheDocument();
  });
});
