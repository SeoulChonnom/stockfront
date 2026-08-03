import { describe, expect, it } from 'vitest';
import type { DailyPageResponse } from '../api/types';
import { mapDailyPageToSnapshot } from './market';

describe('mappers - market', () => {
  it('maps a daily page response into the market snapshot view model', () => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: 'headline',
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: '요약 제목',
          summaryBody: '요약 본문',
          analysis: {
            background: [],
            keyThemes: [],
            outlook: null,
          },
          indices: [
            {
              indexCode: 'IX',
              indexName: 'NASDAQ',
              closePrice: '16274.94',
              changeValue: '120.33',
              changePercent: '0.74',
              highPrice: '16302.11',
              lowPrice: '16180.45',
            },
          ],
          topClusters: [
            {
              clusterId: 'cluster-1',
              title: 'cluster title',
              summary: 'cluster summary',
              articleCount: 3,
              tags: ['AI'],
              representativeArticle: {},
            },
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
      ],
    });

    expect(snapshot.status).toBe('ready');
    expect(snapshot.globalHeadline).toBe('headline');
    expect(snapshot.markets[0].summaryTitle).toBe('요약 제목');
    expect(snapshot.markets[0].summaryBody).toBe('요약 본문');
    expect(snapshot.markets[0].indices[0].direction).toBe('up');
    expect(snapshot.markets[0].clusters[0].id).toBe('cluster-1');
    expect(snapshot.markets[0].clusters[0].title).toBe('cluster title');
    expect(snapshot.markets[0].clusters[0].summary).toBe('cluster summary');
  });

  it.each([null, undefined, 123, { state: 'READY' }])(
    'falls back to a conservative status tone when daily page status is malformed (%p)',
    (status) => {
      const snapshot = mapDailyPageToSnapshot({
        pageId: 1,
        businessDate: '2026-03-31',
        versionNo: 2,
        pageTitle: 'Latest',
        status,
        globalHeadline: 'headline',
        generatedAt: '2026-03-31T06:12:00Z',
        partialMessage: null,
        metadata: {
          rawNewsCount: 1,
          processedNewsCount: 1,
          clusterCount: 1,
          lastUpdatedAt: '2026-03-31T06:12:00Z',
        },
        markets: [],
      } as unknown as DailyPageResponse);

      expect(snapshot.status).toBe('failed');
    }
  );

  it('defensively maps missing daily page market arrays from external DTOs', () => {
    const malformedResponse = {
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: null,
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
    } as unknown as DailyPageResponse;

    expect(() => mapDailyPageToSnapshot(malformedResponse)).not.toThrow();

    const snapshot = mapDailyPageToSnapshot(malformedResponse);

    // null 보존: 예전에는 pageTitle('Latest')로 치환돼, AI 요약 실패가 정상처럼 보였다.
    expect(snapshot.globalHeadline).toBeNull();
    expect(snapshot.markets).toEqual([]);
  });

  it('defensively maps malformed daily page nested generated DTOs', () => {
    const malformedResponse = {
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: null,
      status: 'READY',
      globalHeadline: null,
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: null,
          summaryBody: null,
          analysis: {
            background: 'not an array',
            keyThemes: { theme: 'AI' },
            outlook: null,
          },
          indices: { indexName: 'NASDAQ' },
          topClusters: [
            {
              clusterId: 'cluster-1',
              title: 'cluster title',
              summary: null,
              articleCount: 3,
              tags: 'AI',
              representativeArticle: 'not an object',
            },
            'not a cluster',
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
        'not a market',
      ],
    } as unknown as DailyPageResponse;

    expect(() => mapDailyPageToSnapshot(malformedResponse)).not.toThrow();

    const snapshot = mapDailyPageToSnapshot(malformedResponse);

    expect(snapshot.globalHeadline).toBeNull();
    expect(snapshot.markets).toHaveLength(1);
    // null 보존: summaryTitle을 `${label} 요약`으로 합성하지 않는다.
    expect(snapshot.markets[0].summaryTitle).toBeNull();
    expect(snapshot.markets[0].summaryBody).toBeNull();
    expect(snapshot.markets[0].indices).toEqual([]);
    // `representativeArticle` is 'not an object' in the malformed fixture
    // above (not a plain record), so it maps to an all-null
    // ClusterRepresentativeArticle rather than throwing.
    expect(snapshot.markets[0].clusters).toEqual([
      {
        id: 'cluster-1',
        articleCount: 3,
        title: 'cluster title',
        summary: '클러스터 요약이 아직 생성되지 않았습니다.',
        tags: [],
        representativeArticle: {
          title: null,
          source: null,
          publishedAt: null,
          originalUrl: null,
          mirrorUrl: null,
        },
      },
    ]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'falls back to zero when daily cluster articleCount is non-finite (%p)',
    (articleCount) => {
      const snapshot = mapDailyPageToSnapshot({
        pageId: 1,
        businessDate: '2026-03-31',
        versionNo: 2,
        pageTitle: 'Latest',
        status: 'READY',
        globalHeadline: 'headline',
        generatedAt: '2026-03-31T06:12:00Z',
        partialMessage: null,
        metadata: {
          rawNewsCount: 1,
          processedNewsCount: 1,
          clusterCount: 1,
          lastUpdatedAt: '2026-03-31T06:12:00Z',
        },
        markets: [
          {
            marketType: 'US',
            marketLabel: '미국 증시',
            summaryTitle: '요약 제목',
            summaryBody: '요약 본문',
            analysis: {
              background: [],
              keyThemes: [],
              outlook: null,
            },
            indices: [],
            topClusters: [
              {
                clusterId: 'cluster-1',
                title: 'cluster title',
                summary: 'cluster summary',
                articleCount,
                tags: [],
                representativeArticle: {},
              },
            ],
            articleLinks: [],
            metadata: {
              rawNewsCount: 1,
              processedNewsCount: 1,
              clusterCount: 1,
              lastUpdatedAt: '2026-03-31T06:12:00Z',
              partialMessage: null,
            },
          },
        ],
      } as unknown as DailyPageResponse);

      expect(snapshot.markets[0].clusters[0].articleCount).toBe(0);
    }
  );

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'falls back to zero when daily cluster articleCount is not a nonnegative safe integer (%p)',
    (articleCount) => {
      const snapshot = mapDailyPageToSnapshot({
        pageId: 1,
        businessDate: '2026-03-31',
        versionNo: 2,
        pageTitle: 'Latest',
        status: 'READY',
        globalHeadline: 'headline',
        generatedAt: '2026-03-31T06:12:00Z',
        partialMessage: null,
        metadata: {
          rawNewsCount: 1,
          processedNewsCount: 1,
          clusterCount: 1,
          lastUpdatedAt: '2026-03-31T06:12:00Z',
        },
        markets: [
          {
            marketType: 'US',
            marketLabel: '미국 증시',
            summaryTitle: '요약 제목',
            summaryBody: '요약 본문',
            analysis: {
              background: [],
              keyThemes: [],
              outlook: null,
            },
            indices: [],
            topClusters: [
              {
                clusterId: 'cluster-1',
                title: 'cluster title',
                summary: 'cluster summary',
                articleCount,
                tags: [],
                representativeArticle: {},
              },
            ],
            articleLinks: [],
            metadata: {
              rawNewsCount: 1,
              processedNewsCount: 1,
              clusterCount: 1,
              lastUpdatedAt: '2026-03-31T06:12:00Z',
              partialMessage: null,
            },
          },
        ],
      } as unknown as DailyPageResponse);

      expect(snapshot.markets[0].clusters[0].articleCount).toBe(0);
    }
  );

  it('falls back to safe strings for non-string daily page text fields', () => {
    const malformedResponse = {
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: { text: 'Latest' },
      status: 'READY',
      globalHeadline: 123,
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: { text: '요약 제목' },
          summaryBody: 456,
          analysis: {
            background: [{ text: '배경' }, 789, null],
            keyThemes: [321, { text: 'AI' }],
            outlook: null,
          },
          indices: [],
          topClusters: [
            {
              clusterId: 'cluster-1',
              title: { text: 'cluster title' },
              summary: { text: 'cluster summary' },
              articleCount: 3,
              tags: ['AI'],
              representativeArticle: {
                title: 987,
              },
            },
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
      ],
    } as unknown as DailyPageResponse;

    const snapshot = mapDailyPageToSnapshot(malformedResponse);

    expect(snapshot.globalHeadline).toBeNull();
    // null 보존: summaryTitle을 `${label} 요약`으로 합성하지 않는다.
    expect(snapshot.markets[0].summaryTitle).toBeNull();
    expect(snapshot.markets[0].summaryBody).toBeNull();
    expect(snapshot.markets[0].clusters[0].title).toBe(
      '클러스터 제목이 없습니다.'
    );
    expect(snapshot.markets[0].clusters[0].summary).toBe(
      '클러스터 요약이 아직 생성되지 않았습니다.'
    );
  });

  it('keeps index labels and numeric fields safe when daily index DTO values are objects', () => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: 'headline',
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: '요약 제목',
          summaryBody: '요약 본문',
          analysis: {
            background: [],
            keyThemes: [],
            outlook: null,
          },
          indices: [
            {
              indexCode: 'IX',
              indexName: { text: 'NASDAQ' },
              closePrice: { value: '16274.94' },
              changeValue: { value: '120.33' },
              changePercent: { value: '0.74' },
              highPrice: { value: '16302.11' },
              lowPrice: { value: '16180.45' },
            },
          ],
          topClusters: [],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
      ],
    } as unknown as DailyPageResponse);

    expect(snapshot.markets[0].indices[0]).toEqual({
      label: '-',
      // indexCode는 문자열이면 그대로 보존한다 (§7-2 mono 코드 서브라인).
      code: 'IX',
      value: '-',
      change: '-',
      changeRate: '-',
      direction: 'down',
      high: '-',
      low: '-',
    });
  });

  it('falls back to a safe daily business date when the DTO value is not a string', () => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: { date: '2026-03-31' },
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: 'headline',
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [],
    } as unknown as DailyPageResponse);

    expect(snapshot.businessDate).toBe('-');
  });

  it('uses a valid representative article title as the daily cluster summary fallback', () => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: null,
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: null,
          summaryBody: null,
          analysis: {
            background: ['배경'],
            keyThemes: ['AI'],
            outlook: null,
          },
          indices: [],
          topClusters: [
            {
              clusterId: 'cluster-1',
              title: 'cluster title',
              summary: null,
              articleCount: 3,
              tags: ['AI'],
              representativeArticle: {
                title: 'representative article title',
              },
            },
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
      ],
    });

    // null 보존: 예전에는 pageTitle('Latest')로 치환돼, AI 요약 실패가 정상처럼 보였다.
    expect(snapshot.globalHeadline).toBeNull();
    // null 보존: keyThemes[0]을 summaryTitle로 승격하지 않는다.
    expect(snapshot.markets[0].summaryTitle).toBeNull();
    // null 보존: background.join(' ')을 내러티브 본문으로 쓰지 않는다.
    expect(snapshot.markets[0].summaryBody).toBeNull();
    expect(snapshot.markets[0].clusters[0].summary).toBe(
      'representative article title'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 "Data layer 복원": fields the v2 handoff (README §13) identified as
// present in the DTO but dropped by the mapper. Fixtures below mirror the
// shapes in docs/design_v2/handoff_v2/fixtures.js.
// ─────────────────────────────────────────────────────────────────────────
describe('restored daily page fields (README §13)', () => {
  const LONG_TOKEN =
    'GLOBALMARKETDAILYBRIEFSEMICONDUCTORSUPPLYCHAINRECOVERYANDFOREIGNNETBUYINGANALYSISREPORTVERSIONTHREEFINALDRAFTCONFIDENTIALINTERNALUSEONLYDONOTDISTRIBUTEOUTSIDEOFTHEORGANIZATION2026072712345678';

  it('maps pageId, versionNo, page-level metadata (incl. isLatest), market metadata, analysis, articleLinks, and cluster representativeArticle', () => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 501,
      businessDate: '2026-07-26',
      versionNo: 3,
      pageTitle: '글로벌 시장 일간 요약 - 2026-07-26',
      status: 'READY',
      globalHeadline: '금리 경계 속 기술주 강세',
      generatedAt: '2026-07-27T06:12:10',
      partialMessage: null,
      metadata: {
        rawNewsCount: 174,
        processedNewsCount: 114,
        clusterCount: 21,
        lastUpdatedAt: '2026-07-27T06:12:10',
        isLatest: true,
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: '빅테크 실적 기대와 금리 경계가 교차',
          summaryBody:
            '미국 시장은 주요 기술주의 실적 기대가 지수 상단을 지지했습니다.',
          analysis: {
            background: [
              '대형 기술주 실적 기대가 지수 상단을 지지',
              '장기 금리 반등으로 변동성 확대',
            ],
            keyThemes: ['금리', 'AI 설비투자'],
            outlook: '다음 거래일에는 PCE 물가가 방향을 결정할 변수다.',
          },
          indices: [],
          topClusters: [
            {
              clusterId: '51f0d9a0-9fc5-4f15-a4f9-62856f128683',
              title: '연준 위원 발언 이후 장기 금리 반등',
              summary: '정책금리 경로에 대한 신중론이 재확인됐습니다.',
              articleCount: 8,
              tags: ['Fed', 'Treasury'],
              representativeArticle: {
                title: '연준 위원 "금리 인하 서두를 필요 없다"',
                publisherName: '연합뉴스',
                publishedAt: '2026-07-26T22:41:00',
                originLink: 'https://example.com/article/fed-1',
                naverLink: 'https://n.news.naver.com/article/fed1',
              },
            },
          ],
          articleLinks: [
            {
              processedArticleId: 2101,
              clusterId: '51f0d9a0-9fc5-4f15-a4f9-62856f128683',
              clusterTitle: '연준 위원 발언 이후 장기 금리 반등',
              title: '연준 위원 "금리 인하 서두를 필요 없다"',
              publisherName: '연합뉴스',
              publishedAt: '2026-07-26T22:41:00',
              originLink: 'https://example.com/article/fed-1',
              naverLink: 'https://n.news.naver.com/article/fed1',
            },
            {
              processedArticleId: 2102,
              clusterId: '51f0d9a0-9fc5-4f15-a4f9-62856f128683',
              clusterTitle: '연준 위원 발언 이후 장기 금리 반등',
              title: '두 번째 근거 기사',
              publisherName: '한국경제',
              publishedAt: '2026-07-26T21:03:00',
              originLink: 'https://example.com/article/fed-2',
              naverLink: null,
            },
          ],
          metadata: {
            rawNewsCount: 85,
            processedNewsCount: 26,
            clusterCount: 7,
            lastUpdatedAt: '2026-07-27T06:12:10',
            partialMessage: null,
          },
        },
      ],
      // `isLatest` above is not part of DailyPageResponse (see
      // docs/api_spec_doc.md:175-180) — cast needed since the fixture
      // deliberately includes it to prove the mapper stays
      // forward-compatible if the backend ever adds it.
    } as unknown as DailyPageResponse);

    expect(snapshot.pageId).toBe(501);
    expect(snapshot.versionNo).toBe(3);
    expect(snapshot.generatedAtIso).toBe('2026-07-27T06:12:10');
    expect(snapshot.partialMessage).toBeNull();
    expect(snapshot.metadata).toEqual({
      rawNewsCount: 174,
      processedNewsCount: 114,
      clusterCount: 21,
      lastUpdatedAt: '2026-07-27 06:12 KST',
      isLatest: true,
    });

    const market = snapshot.markets[0];
    expect(market.analysis).toEqual({
      background: [
        '대형 기술주 실적 기대가 지수 상단을 지지',
        '장기 금리 반등으로 변동성 확대',
      ],
      keyThemes: ['금리', 'AI 설비투자'],
      outlook: '다음 거래일에는 PCE 물가가 방향을 결정할 변수다.',
    });
    expect(market.metadata).toEqual({
      rawNewsCount: 85,
      processedNewsCount: 26,
      clusterCount: 7,
      lastUpdatedAt: '2026-07-27 06:12 KST',
      partialMessage: null,
    });
    const articleLinks = market.articleLinks ?? [];
    expect(articleLinks).toHaveLength(2);
    expect(articleLinks[0]).toEqual({
      id: '2101',
      clusterId: '51f0d9a0-9fc5-4f15-a4f9-62856f128683',
      clusterTitle: '연준 위원 발언 이후 장기 금리 반등',
      title: '연준 위원 "금리 인하 서두를 필요 없다"',
      source: '연합뉴스',
      publishedAt: '2026-07-26 22:41 KST',
      originalUrl: 'https://example.com/article/fed-1',
      mirrorUrl: 'https://n.news.naver.com/article/fed1',
    });
    // naverLink is null for the second article — mirrorUrl must stay null,
    // not fall back to the origin link (that fallback belongs only to the
    // pre-existing ClusterArticle/mapClusterArticle behavior).
    expect(articleLinks[1].mirrorUrl).toBeNull();

    expect(market.clusters[0].representativeArticle).toEqual({
      title: '연준 위원 "금리 인하 서두를 필요 없다"',
      source: '연합뉴스',
      publishedAt: '2026-07-26 22:41 KST',
      originalUrl: 'https://example.com/article/fed-1',
      mirrorUrl: 'https://n.news.naver.com/article/fed1',
    });
  });

  it('keeps articleLinks/analysis empty arrays (not null) and null sub-fields for sparse markets, and treats a genuinely absent isLatest as null', () => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 501,
      businessDate: '2026-07-26',
      versionNo: 3,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: null,
      generatedAt: '2026-07-27T06:12:10',
      partialMessage: null,
      metadata: {
        rawNewsCount: 12,
        processedNewsCount: 0,
        clusterCount: 0,
        lastUpdatedAt: '2026-07-27T06:12:10',
        // isLatest deliberately omitted: real DailyPageResponse.metadata
        // objects that predate this field (or a backend that hasn't shipped
        // it yet) won't include it.
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: null,
          summaryBody: null,
          analysis: { background: [], keyThemes: [], outlook: null },
          indices: [],
          topClusters: [
            {
              clusterId: 'cluster-sparse',
              title: '희소 클러스터',
              summary: null,
              articleCount: 1,
              tags: [],
              representativeArticle: {},
            },
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 12,
            processedNewsCount: 0,
            clusterCount: 0,
            lastUpdatedAt: '2026-07-27T06:12:10',
            partialMessage: 'AI 요약 1건이 생성되지 않았습니다.',
          },
        },
      ],
    } as unknown as DailyPageResponse);

    expect(snapshot.metadata?.isLatest).toBeNull();
    expect(snapshot.markets[0].articleLinks).toEqual([]);
    expect(snapshot.markets[0].analysis).toEqual({
      background: [],
      keyThemes: [],
      outlook: null,
    });
    expect(snapshot.markets[0].metadata?.partialMessage).toBe(
      'AI 요약 1건이 생성되지 않았습니다.'
    );
    expect(snapshot.markets[0].clusters[0].representativeArticle).toEqual({
      title: null,
      source: null,
      publishedAt: null,
      originalUrl: null,
      mirrorUrl: null,
    });
  });

  it('maps the page-level PARTIAL banner message, distinct from any per-market metadata.partialMessage', () => {
    // This is DailyPageResponse.partialMessage — a sibling of `metadata`,
    // not `metadata.partialMessage`. Both must reach the view model: the
    // PARTIAL banner (README §7-2) renders the page-level message plus a
    // per-market "시장명 — 메시지" line sourced from metadata.partialMessage.
    const snapshot = mapDailyPageToSnapshot({
      pageId: 501,
      businessDate: '2026-07-26',
      versionNo: 3,
      pageTitle: 'Latest',
      status: 'PARTIAL',
      globalHeadline: 'headline',
      generatedAt: '2026-07-27T06:12:10',
      partialMessage:
        '한국 증시 지수 2종과 미국 클러스터 요약 1건이 누락된 상태로 생성됐습니다.',
      metadata: {
        rawNewsCount: 126,
        processedNewsCount: 74,
        clusterCount: 15,
        lastUpdatedAt: '2026-07-27T06:19:44',
        isLatest: true,
      },
      markets: [],
      // Cast for the same reason as the test above: `isLatest` is not part
      // of DailyPageResponse (docs/api_spec_doc.md:175-180).
    } as unknown as DailyPageResponse);

    expect(snapshot.partialMessage).toBe(
      '한국 증시 지수 2종과 미국 클러스터 요약 1건이 누락된 상태로 생성됐습니다.'
    );
  });

  it('defensively maps malformed market metadata/analysis/articleLinks without throwing', () => {
    const malformedResponse = {
      pageId: 501,
      businessDate: '2026-07-26',
      versionNo: 3,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: 'headline',
      generatedAt: '2026-07-27T06:12:10',
      partialMessage: null,
      metadata: 'not an object',
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: 'title',
          summaryBody: 'body',
          analysis: { background: 'not an array', keyThemes: 42, outlook: 7 },
          indices: [],
          topClusters: [],
          articleLinks: ['not a record', 42, null, { title: 'kept' }],
          metadata: 'also not an object',
        },
      ],
    } as unknown as DailyPageResponse;

    expect(() => mapDailyPageToSnapshot(malformedResponse)).not.toThrow();

    const snapshot = mapDailyPageToSnapshot(malformedResponse);

    expect(snapshot.metadata).toEqual({
      rawNewsCount: 0,
      processedNewsCount: 0,
      clusterCount: 0,
      lastUpdatedAt: null,
      isLatest: null,
    });
    expect(snapshot.markets[0].analysis).toEqual({
      background: [],
      keyThemes: [],
      outlook: null,
    });
    expect(snapshot.markets[0].metadata).toEqual({
      rawNewsCount: 0,
      processedNewsCount: 0,
      clusterCount: 0,
      lastUpdatedAt: null,
      partialMessage: null,
    });
    // Non-record entries are filtered out; the one plain-object entry
    // survives with safe fallbacks for its missing fields.
    const survivingLinks = snapshot.markets[0].articleLinks ?? [];
    expect(survivingLinks).toHaveLength(1);
    expect(survivingLinks[0]).toMatchObject({
      title: 'kept',
      source: null,
      publishedAt: null,
      originalUrl: '',
      mirrorUrl: null,
    });
  });

  it('handles heavy fixtures (long no-space tokens, many articleLinks) without truncating or throwing', () => {
    const manyLinks = Array.from({ length: 50 }, (_, i) => ({
      processedArticleId: 3000 + i,
      clusterId: 'cluster-heavy',
      clusterTitle: `heavy cluster ${LONG_TOKEN}`,
      title: `근거 기사 ${i} — ${LONG_TOKEN}`,
      publisherName: '매일경제',
      publishedAt: '2026-07-26T23:00:00',
      originLink: `https://example.com/article/heavy-${i}`,
      naverLink:
        i % 5 === 4 ? null : `https://n.news.naver.com/article/heavy${i}`,
    }));

    const snapshot = mapDailyPageToSnapshot({
      pageId: 501,
      businessDate: '2026-07-26',
      versionNo: 3,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: `headline with token ${LONG_TOKEN}`,
      generatedAt: '2026-07-27T06:12:10',
      partialMessage: null,
      metadata: {
        rawNewsCount: 174,
        processedNewsCount: 114,
        clusterCount: 21,
        lastUpdatedAt: '2026-07-27T06:12:10',
        isLatest: true,
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: 'title',
          summaryBody: `body with token ${LONG_TOKEN}`,
          analysis: {
            background: [LONG_TOKEN],
            keyThemes: [LONG_TOKEN],
            outlook: LONG_TOKEN,
          },
          indices: [],
          topClusters: [],
          articleLinks: manyLinks,
          metadata: {
            rawNewsCount: 85,
            processedNewsCount: 26,
            clusterCount: 7,
            lastUpdatedAt: '2026-07-27T06:12:10',
            partialMessage: null,
          },
        },
      ],
      // Cast for the same reason as the tests above: `isLatest` is not part
      // of DailyPageResponse (docs/api_spec_doc.md:175-180).
    } as unknown as DailyPageResponse);

    expect(() => JSON.stringify(snapshot)).not.toThrow();
    const heavyLinks = snapshot.markets[0].articleLinks ?? [];
    expect(heavyLinks).toHaveLength(50);
    expect(heavyLinks[49].mirrorUrl).toBeNull();
    expect(heavyLinks[0].title).toContain(LONG_TOKEN);
    expect(snapshot.markets[0].analysis?.outlook).toBe(LONG_TOKEN);
  });
});
