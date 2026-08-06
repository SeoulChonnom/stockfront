import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '../lib/capabilities';
import type { MarketSnapshot } from '../lib/view-models';
import { MarketOverviewPage } from './market-overview-page';

/**
 * Phase 6 rebuild (README `docs/design_v2/handoff_v2/README.md` §7-2/§7-3).
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
        },
      },
    ],
    ...overrides,
  };
}

afterEach(() => {
  resetRoleOverrideForTesting();
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

    // "S&P 500" legitimately renders twice — once as the compare strip's
    // lead-index label, once as the index table's row header — so this
    // asserts presence via `getAllByText` rather than the single-match
    // `getByText`.
    expect(screen.getAllByText('S&P 500').length).toBeGreaterThan(0);
    expect(screen.getByText('+12.34')).toBeInTheDocument();
    expect(screen.getByText('+0.23%')).toBeInTheDocument();
    // The 고가/저가 columns are hidden below 640px with `sm:hidden`/
    // `sm:table-cell` (CSS-only), never unmounted — this subline node must
    // exist in the DOM regardless of viewport, per README §11 ("같은 값을
    // 우선순위 행의 보조 줄로 노출한다").
    expect(screen.getByText('고 5,499.80 · 저 5,455.22')).toBeInTheDocument();
  });

  it('scrolls to and focuses the destination market heading from 섹션 이동', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const previousScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView'
    );
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
      writable: true,
    });

    try {
      render(
        <MarketOverviewPage
          mode='latest'
          now={FIXED_NOW}
          snapshot={buildSnapshot()}
        />
      );

      await user.click(screen.getByRole('button', { name: '섹션 이동' }));

      const heading = screen.getByRole('heading', {
        level: 2,
        name: '미국 증시',
      });
      expect(heading).toHaveAttribute('tabindex', '-1');
      expect(heading).toHaveFocus();
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    } finally {
      if (previousScrollIntoView) {
        Object.defineProperty(
          HTMLElement.prototype,
          'scrollIntoView',
          previousScrollIntoView
        );
      } else {
        delete (HTMLElement.prototype as { scrollIntoView?: unknown })
          .scrollIntoView;
      }
    }
  });
});

describe('MarketOverviewPage — PARTIAL 배너', () => {
  it('lists the page-level message and each market’s metadata.partialMessage', () => {
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

    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText('이 브리프는 일부 데이터가 누락된 상태로 생성됐습니다')
    ).toBeInTheDocument();
    expect(
      screen.getByText('한국 증시 섹션이 일부 누락된 상태로 생성됐습니다.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '미국 증시 — 뉴스 수집이 지연되어 일부 기사가 누락됐습니다.'
      )
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
  it('renders the exact fallback copy when there is no headline', () => {
    const snapshot = buildSnapshot({ globalHeadline: '' });

    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText(
        '글로벌 헤드라인이 생성되지 않았습니다. AI 요약 단계가 실패했을 수 있습니다 — 아래 상태와 배치 로그에서 원인을 확인하세요.'
      )
    ).toBeInTheDocument();
  });
});

describe('MarketOverviewPage — markets:[] 빈 상태', () => {
  it('shows the FAILED-specific reason and hides the ops action for a non-admin user', () => {
    const snapshot = buildSnapshot({ status: 'failed', markets: [] });

    setRoleOverride('user');
    render(
      <MarketOverviewPage mode='latest' now={FIXED_NOW} snapshot={snapshot} />
    );

    expect(
      screen.getByText('시장 섹션이 생성되지 않았습니다')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '이 날짜의 배치가 뉴스 수집 단계에서 실패해 시장 섹션이 생성되지 않았습니다.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '배치 상태 확인' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '다른 날짜 찾기' })
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
});
