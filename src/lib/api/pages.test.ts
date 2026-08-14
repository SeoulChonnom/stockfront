import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetAuthBootstrapForTesting } from '../auth-bootstrap';
import type { ArchiveListParams } from './archive';
import { getDailyPageByPageId } from './pages';
import type {
  ArticleLinkResponse,
  ClusterDetailResponse,
  DailyPageResponse,
  ThemeNodeResponse,
} from './types';

const representativeArticle = {
  processedArticleId: 1024,
  clusterId: 'cluster-1',
  clusterTitle: '반도체 업종 강세',
  title: '반도체 업종 강세 지속',
  publisherName: '서울경제',
  publishedAt: '2026-08-13T01:10:00Z',
  originLink: 'https://example.com/article',
  naverLink: null,
  similarGroupId: 'sim-cluster-1-1',
  isSimilarGroupRepresentative: true,
  exactDuplicateCount: 0,
} satisfies ArticleLinkResponse;

const representativeDailyPage = {
  pageId: 501,
  businessDate: '2026-08-13',
  versionNo: 1,
  pageTitle: '글로벌 시장 일간 요약',
  status: 'READY',
  globalHeadline: '시장 반등',
  generatedAt: '2026-08-13T06:00:00Z',
  partialMessage: null,
  issues: [],
  keyPoints: [
    {
      kind: 'direction',
      label: '시장 방향',
      direction: 'MIXED',
      text: '미국과 한국 시장의 흐름이 엇갈렸습니다.',
    },
    {
      kind: 'driver',
      label: '주요 원인',
      text: '금리와 수급이 주요 변동 요인이었습니다.',
    },
    {
      kind: 'watch',
      label: '관전 포인트',
      text: '다음 거래일의 물가 지표를 확인해야 합니다.',
    },
  ],
  markets: [],
  metadata: {
    rawNewsCount: 10,
    processedNewsCount: 8,
    clusterCount: 2,
    lastUpdatedAt: '2026-08-13T06:00:00Z',
    isLatest: true,
  },
  navigation: {
    previousBusinessDate: '2026-08-12',
    nextBusinessDate: '2026-08-14',
  },
  versions: [
    {
      pageId: 501,
      versionNo: 1,
      status: 'READY',
      generatedAt: '2026-08-13T06:00:00Z',
      isLatest: true,
    },
  ],
} satisfies DailyPageResponse;

const representativeCluster = {
  clusterId: 'cluster-1',
  businessDate: '2026-08-13',
  marketType: 'KR',
  marketLabel: '한국 증시',
  title: '반도체 업종 강세',
  tags: ['반도체'],
  summary: {
    short: '반도체주가 강세를 보였습니다.',
    long: '외국인 매수세가 업종 상승을 이끌었습니다.',
    analysisStatus: 'READY',
    analysisGeneratedAt: '2026-08-13T05:30:00Z',
    analysisIssues: [],
    conflictStatus: 'NONE',
    sections: [
      {
        kind: 'background',
        title: '발생 배경',
        paragraphs: [
          {
            sentences: [
              {
                text: '반도체 업종의 수요 기대가 커졌습니다.',
                sourceArticleIds: [1024],
                conflictStatus: 'NONE',
                conflictingSourceArticleIds: [],
                conflictNote: null,
              },
            ],
          },
        ],
      },
    ],
  },
  representativeArticle: {
    processedArticleId: 1024,
    title: '반도체 업종 강세 지속',
    publisherName: '서울경제',
    publishedAt: '2026-08-13T01:10:00Z',
    originLink: 'https://example.com/article',
    naverLink: null,
    sourceSummary: '업종 수요 기대가 확대되었습니다.',
    similarGroupId: 'sim-cluster-1-1',
    isSimilarGroupRepresentative: true,
    exactDuplicateCount: 0,
  },
  articles: [
    {
      processedArticleId: 1024,
      title: '반도체 업종 강세 지속',
      publisherName: '서울경제',
      publishedAt: '2026-08-13T01:10:00Z',
      originLink: 'https://example.com/article',
      naverLink: null,
      sourceSummary: '업종 수요 기대가 확대되었습니다.',
      similarGroupId: 'sim-cluster-1-1',
      isSimilarGroupRepresentative: true,
      exactDuplicateCount: 0,
    },
  ],
  articleGrouping: {
    status: 'READY',
    generatedAt: '2026-08-13T05:30:00Z',
    issue: null,
  },
  lastUpdatedAt: '2026-08-13T05:30:00Z',
  articleCount: 1,
} satisfies ClusterDetailResponse;

const representativeTheme = {
  code: 'SECTOR',
  label: '산업',
  description: '산업별 시장 테마',
  children: [
    {
      code: 'SECTOR_SEMICONDUCTORS',
      label: '반도체',
      description: '반도체 산업',
      children: [],
    },
  ],
} satisfies ThemeNodeResponse;

const representativeArchiveParams = {
  fromDate: '2026-08-01',
  toDate: '2026-08-31',
  status: 'READY',
  marketType: 'KR',
  theme: ['SECTOR', 'MARKET_FLOW_INVESTOR'],
  q: '외국인 매수',
  page: 1,
  size: 30,
} satisfies ArchiveListParams;

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

describe('page API', () => {
  afterEach(() => {
    resetAuthBootstrapForTesting();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('accepts representative final backend contract objects', () => {
    expect(representativeArticle.processedArticleId).toBe(1024);
    expect(representativeDailyPage.metadata.isLatest).toBe(true);
    expect(representativeCluster.summary.sections[0]?.kind).toBe('background');
    expect(representativeTheme.children[0]?.children).toEqual([]);
    expect(representativeArchiveParams.theme).toEqual([
      'SECTOR',
      'MARKET_FLOW_INVESTOR',
    ]);
  });

  it('fetches archive page detail by documented pageId path', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        createJsonResponse({
          success: true,
          data: {
            pageId: 42,
            businessDate: '2026-03-31',
            versionNo: 2,
            pageTitle: 'Archive',
            status: 'READY',
            globalHeadline: 'headline',
            generatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
            markets: [],
            metadata: {
              rawNewsCount: 0,
              processedNewsCount: 0,
              clusterCount: 0,
              lastUpdatedAt: '2026-03-31T06:12:00Z',
            },
          },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getDailyPageByPageId(42)).resolves.toMatchObject({
      pageId: 42,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://localhost:8000/stock/api/pages/42'
    );
  });
});
