/**
 * Network-routing mock API for Playwright.
 *
 * This is an independent TypeScript port of the fixture factories in
 * `docs/design_v2/handoff_v2/fixtures.js` (that file is a design reference —
 * it is never imported or edited from here). The factory functions
 * (`pageFixture`, `archiveFixture`, `clusterFixture`, `batchListFixture`,
 * `batchDetailFixture`, `triggerResult`, `ERRORS`, `LONG_SAMPLES`, `NOW_KST`,
 * `TODAY`, `shiftDate`) are kept structurally identical to the original
 * (same field names/shapes) where the original still matches the real DTO
 * contract. The `Batch` section is the one deliberate exception: it now
 * follows `docs/api_spec.json` (the real OpenAPI spec, jobType-split model)
 * instead of `docs/api_spec_doc.md` §4 (the old single-batch model the
 * design fixture still uses) — see the `Batch` section's own comments for
 * what changed and why. Everything else is still JS -> TS only.
 *
 * `installMockApi(page, options)` is the actual Playwright integration: it
 * intercepts every request the app makes via `page.route()` and responds
 * with the `{success, data, meta}` envelope shape `src/lib/api/client.ts`
 * expects (see that file's `apiRequest()` — it throws unless the parsed body
 * has a `data` key and `success !== false`).
 *
 * Kept intentionally reusable beyond the Phase 8 overflow sweep (per-resource
 * overrides, scenario coverage for 401/403/409/422/429/5xx/network) since
 * this harness is also the foundation for Phase 9.
 */
import type { Page, Route } from '@playwright/test';

import type { ApiEnvelope } from '../../src/lib/api/types';

// ---------------------------------------------------------------------------
// Shared constants / helpers (ported from fixtures.js)
// ---------------------------------------------------------------------------

export const NOW_KST = '2026-07-27T08:24:31';
export const TODAY = '2026-07-27';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function rep<T>(n: number, f: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => f(i));
}

// ---------------------------------------------------------------------------
// DTO-shaped types (mirrors docs/api_spec_doc.md §4, not `src/lib/api/types.ts`
// verbatim — the app's TS types declare price fields as `string`, but the
// real backend spec and `fixtures.js` both use `number`; the mock matches the
// documented wire format).
// ---------------------------------------------------------------------------

export type MarketType = 'US' | 'KR';
export type PageStatus = 'READY' | 'PARTIAL' | 'FAILED';

export type ArticleResponse = {
  processedArticleId: number;
  title: string;
  publisherName: string;
  publishedAt: string;
  originLink: string;
  naverLink: string | null;
};

export type RepresentativeArticleResponse = {
  title?: string | null;
  publisherName?: string | null;
  publishedAt?: string | null;
  originLink?: string | null;
  naverLink?: string | null;
};

export type IndexCard = {
  indexCode: string;
  indexName: string;
  closePrice: number;
  changeValue: number;
  changePercent: number;
  highPrice: number | null;
  lowPrice: number | null;
};

export type ClusterCard = {
  clusterId: string;
  title: string;
  summary: string | null;
  articleCount: number;
  tags: string[];
  representativeArticle: RepresentativeArticleResponse;
};

export type ArticleLink = ArticleResponse & {
  clusterId?: string;
  clusterTitle?: string;
};

export type MarketAnalysis = {
  background: string[];
  keyThemes: string[];
  outlook: string | null;
};

export type MarketMetadata = {
  rawNewsCount: number;
  processedNewsCount: number;
  clusterCount: number;
  lastUpdatedAt: string;
  partialMessage: string | null;
};

export type MarketSection = {
  marketType: MarketType;
  marketLabel: string;
  summaryTitle: string | null;
  summaryBody: string | null;
  analysis: MarketAnalysis;
  indices: IndexCard[];
  topClusters: ClusterCard[];
  articleLinks: ArticleLink[];
  metadata: MarketMetadata;
};

export type DailyPage = {
  pageId: number;
  businessDate: string;
  versionNo: number;
  pageTitle: string;
  status: PageStatus;
  globalHeadline: string | null;
  generatedAt: string;
  partialMessage: string | null;
  markets: MarketSection[];
  metadata: {
    rawNewsCount: number;
    processedNewsCount: number;
    clusterCount: number;
    lastUpdatedAt: string;
    isLatest: boolean;
  };
};

export type ArchiveItem = {
  pageId: number;
  businessDate: string;
  pageTitle: string;
  headlineSummary: string | null;
  status: PageStatus;
  generatedAt: string;
  partialMessage: string | null;
};

export type ArchiveList = {
  items: ArchiveItem[];
  pagination: { page: number; size: number; totalCount: number };
};

export type ClusterArticle = {
  processedArticleId: number | null;
  title: string;
  publisherName: string | null;
  publishedAt: string | null;
  originLink: string;
  naverLink: string | null;
};

export type ClusterDetail = {
  clusterId: string;
  businessDate: string;
  marketType: MarketType;
  marketLabel: string;
  title: string;
  tags: string[];
  summary: { short: string | null; long: string | null; analysis: string[] };
  representativeArticle: ClusterArticle & { sourceSummary: string | null };
  articles: ClusterArticle[];
  lastUpdatedAt: string;
  articleCount: number;
};

export type BatchJobStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

/**
 * `docs/api_spec.json`'s `BatchJobType` enum. Batches used to be a single
 * unified `market_daily_batch` job (the shape this file ported before);
 * the real backend now splits every run into one of these two independent
 * job types, each with its own 6-stage pipeline and its own detail
 * sub-object (`BatchSnapshotDetail`/`BatchNewsCollectionDetail` below).
 */
export type BatchJobType = 'NEWS_COLLECTION' | 'MARKET_SNAPSHOT';

export type BatchListItem = {
  jobId: number;
  jobType: BatchJobType;
  jobName: string;
  businessDate: string;
  status: BatchJobStatus;
  /** Current/last pipeline step name (see `BATCH_STAGE_KEYS` below), or `null`. New in `docs/api_spec.json` — the old model had no per-stage signal at all. */
  currentStep: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  marketScope: string;
  rawNewsCount: number;
  processedNewsCount: number;
  clusterCount: number;
  pageId: number | null;
  pageVersionNo: number | null;
  partialMessage: string | null;
};

export type BatchList = {
  items: BatchListItem[];
  pagination: { page: number; size: number; totalCount: number };
  summary: {
    successCount: number;
    partialCount: number;
    failedCount: number;
    avgDurationSeconds: number;
  };
};

/**
 * `docs/api_spec.json`'s `BatchJobSnapshotDetail` — only present (non-null)
 * on a `MARKET_SNAPSHOT` job's detail response.
 */
export type BatchSnapshotDetail = {
  forceRun: boolean | null;
  rebuildPageOnly: boolean | null;
  rawNewsCount: number;
  processedNewsCount: number;
  clusterCount: number;
  pageId: number | null;
  pageVersionNo: number | null;
};

/**
 * `docs/api_spec.json`'s `BatchJobNewsCollectionDetail` — only present
 * (non-null) on a `NEWS_COLLECTION` job's detail response. The app doesn't
 * consume this sub-object yet (out of scope for the jobType-wiring pass
 * that added it here); it's typed/populated for wire-shape fidelity only.
 */
export type BatchNewsCollectionDetail = {
  runId: number;
  providerName: string;
  windowStartAt: string;
  windowEndAt: string;
  queryStartAt: string;
  queryEndAt: string;
  totalKeywordCount: number;
  completedKeywordCount: number;
  fetchedCount: number;
  matchedCount: number;
  insertedCount: number;
  coverageComplete: boolean;
};

/**
 * `docs/api_spec.json`'s `BatchJobDetailResponse`. Deliberately NOT
 * `BatchListItem & {...}` any more — the real detail response nests the
 * snapshot/news-collection fields under `snapshot`/`newsCollection` instead
 * of carrying them flat, and drops `marketScope` entirely. Also drops the
 * old `stages: BatchStage[]`/`impact`/`retryable` fields this file used to
 * fabricate: none of those three ever existed in any real API contract
 * (old or new) and the app never read them from the wire — `PipelineStages`
 * derives its own stage view from `jobType`/`status`/`errorCode`/
 * `currentStep`, and `format-batch.ts` derives impact/retryable from the
 * mapped `BatchRunRow` client-side.
 */
export type BatchDetail = {
  jobId: number;
  jobType: BatchJobType;
  jobName: string;
  businessDate: string;
  status: BatchJobStatus;
  currentStep: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  partialMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  logSummary: string | null;
  snapshot: BatchSnapshotDetail | null;
  newsCollection: BatchNewsCollectionDetail | null;
};

export type TriggerSuccess = {
  jobId: number;
  jobName: string;
  businessDate: string;
  status: string;
  startedAt: string;
};

export type TriggerErrorBody = {
  http: number;
  code: string;
  message: string;
  existingJobId?: number;
  field?: string;
  retryAfter?: number;
};

export type TriggerResult =
  | { data: TriggerSuccess }
  | { error: TriggerErrorBody };

export type AiRetrySuccess = {
  jobId: number;
  jobName: string;
  businessDate: string;
  status: string;
  runMode: string;
  sourceJobId: number;
  sourcePageId: number | null;
  idempotencyKey: string | null;
  startedAt: string;
};

export type AiRetryResult =
  | { data: AiRetrySuccess }
  | { error: TriggerErrorBody };

// ---------------------------------------------------------------------------
// Indices / articles / clusters (static seed data)
// ---------------------------------------------------------------------------

const US_INDICES: IndexCard[] = [
  {
    indexCode: '^GSPC',
    indexName: 'S&P 500',
    closePrice: 5487.03,
    changeValue: 21.43,
    changePercent: 0.39,
    highPrice: 5499.8,
    lowPrice: 5455.22,
  },
  {
    indexCode: '^IXIC',
    indexName: 'NASDAQ',
    closePrice: 17862.23,
    changeValue: 87.51,
    changePercent: 0.49,
    highPrice: 17910.34,
    lowPrice: 17720.03,
  },
  {
    indexCode: '^DJI',
    indexName: 'DOW JONES',
    closePrice: 39308.0,
    changeValue: -23.85,
    changePercent: -0.06,
    highPrice: 39430.1,
    lowPrice: 39180.42,
  },
  {
    indexCode: '^RUT',
    indexName: 'RUSSELL 2000',
    closePrice: 2189.55,
    changeValue: 9.87,
    changePercent: 0.45,
    highPrice: 2196.4,
    lowPrice: 2174.11,
  },
  {
    indexCode: '^VIX',
    indexName: 'VIX',
    closePrice: 13.42,
    changeValue: -0.61,
    changePercent: -4.35,
    highPrice: 14.2,
    lowPrice: 13.28,
  },
];

const KR_INDICES: IndexCard[] = [
  {
    indexCode: 'KS11',
    indexName: 'KOSPI',
    closePrice: 2765.53,
    changeValue: 18.21,
    changePercent: 0.66,
    highPrice: 2772.11,
    lowPrice: 2742.48,
  },
  {
    indexCode: 'KQ11',
    indexName: 'KOSDAQ',
    closePrice: 812.77,
    changeValue: -2.84,
    changePercent: -0.35,
    highPrice: 819.24,
    lowPrice: 808.9,
  },
  {
    indexCode: 'KRX300',
    indexName: 'KRX 300',
    closePrice: 1684.91,
    changeValue: 6.04,
    changePercent: 0.36,
    highPrice: 1691.2,
    lowPrice: 1672.81,
  },
  {
    indexCode: 'USDKRW',
    indexName: 'USD/KRW',
    closePrice: 1342.5,
    changeValue: -4.2,
    changePercent: -0.31,
    highPrice: 1348.9,
    lowPrice: 1341.2,
  },
];

const PUBLISHERS = [
  '매일경제',
  '한국경제',
  '연합뉴스',
  '서울경제',
  '조선비즈',
  'Reuters Korea',
  '이데일리',
  '머니투데이',
];

function article(
  i: number,
  seed: number,
  opts: { title?: string } = {}
): ArticleResponse {
  const h = 23 - (i % 9);
  return {
    processedArticleId: 2000 + seed * 100 + i,
    title:
      opts.title ??
      `${seed % 2 === 0 ? '반도체' : '외국인'} 수급 개선에 지수 상승 폭 확대 (${i + 1})`,
    publisherName: PUBLISHERS[(seed + i) % PUBLISHERS.length],
    publishedAt: `2026-07-26T${pad(h)}:${pad((i * 7) % 60)}:00`,
    originLink: `https://example.com/article/${seed}-${i}`,
    naverLink:
      i % 5 === 4 ? null : `https://n.news.naver.com/article/${seed}${i}`,
  };
}

const US_CLUSTERS: ClusterCard[] = [
  {
    clusterId: '51f0d9a0-9fc5-4f15-a4f9-62856f128683',
    title: '연준 위원 발언 이후 장기 금리 반등',
    summary:
      '정책금리 경로에 대한 신중론이 재확인되며 성장주 중심으로 장중 등락이 확대됐습니다.',
    articleCount: 8,
    tags: ['Fed', 'Treasury', 'Big Tech'],
    representativeArticle: {
      title: '연준 위원 "금리 인하 서두를 필요 없다"',
      publisherName: '연합뉴스',
      publishedAt: '2026-07-26T22:41:00',
      originLink: 'https://example.com/article/fed-1',
      naverLink: 'https://n.news.naver.com/article/fed1',
    },
  },
  {
    clusterId: '7a2b41c8-3d5e-4f21-9b0c-1e8d7f6a5b43',
    title: 'AI 인프라 투자 확대가 반도체주 지지',
    summary:
      '클라우드 사업자의 설비투자 계획이 관련 공급망 실적 기대를 높였습니다.',
    articleCount: 6,
    tags: ['AI', 'Semiconductor', 'Capex'],
    representativeArticle: {
      title: '하이퍼스케일러 설비투자 상향, 반도체 공급망 수혜',
      publisherName: 'Reuters Korea',
      publishedAt: '2026-07-26T21:12:00',
      originLink: 'https://example.com/article/ai-1',
      naverLink: null,
    },
  },
  {
    clusterId: '9c4d2e10-8b7a-4c36-a5f1-0d3e9b8c7a62',
    title: '에너지 업종은 유가 조정에 약세',
    summary:
      '공급 우려 완화로 유가가 하락하며 정유·탐사 업종이 지수 대비 부진했습니다.',
    articleCount: 4,
    tags: ['Energy', 'OPEC'],
    representativeArticle: {
      title: 'WTI 3% 하락, 공급 차질 우려 완화',
      publisherName: '서울경제',
      publishedAt: '2026-07-26T20:05:00',
      originLink: 'https://example.com/article/oil-1',
      naverLink: 'https://n.news.naver.com/article/oil1',
    },
  },
  {
    clusterId: '2e6f8a04-1c9b-4d75-8e3a-6f2b1d0c9e58',
    title: '소매 실적 시즌 앞두고 소비 지표 혼조',
    summary:
      '카드 지출 데이터와 오프라인 트래픽이 엇갈리며 소비 관련주 변동성이 커졌습니다.',
    articleCount: 3,
    tags: ['Retail', 'Consumer'],
    representativeArticle: {
      title: '카드 지출 증가율 둔화, 오프라인 트래픽은 개선',
      publisherName: '한국경제',
      publishedAt: '2026-07-26T19:33:00',
      originLink: 'https://example.com/article/retail-1',
      naverLink: 'https://n.news.naver.com/article/retail1',
    },
  },
];

const KR_CLUSTERS: ClusterCard[] = [
  {
    clusterId: 'b3d51e7c-04a8-4f62-9d18-7c5e2a9b6f31',
    title: '반도체 수출 개선 기대에 대형주 강세',
    summary: '메모리 가격 회복과 수출 지표 개선이 외국인 수급을 자극했습니다.',
    articleCount: 9,
    tags: ['반도체', '외국인', '수출'],
    representativeArticle: {
      title: '7월 반도체 수출 증가율 두 자릿수 회복',
      publisherName: '매일경제',
      publishedAt: '2026-07-26T17:20:00',
      originLink: 'https://example.com/article/semi-1',
      naverLink: 'https://n.news.naver.com/article/semi1',
    },
  },
  {
    clusterId: 'd8f0a2c6-5b13-4e79-8a4f-2c9d1e6b3a75',
    title: '원화 강세와 외국인 현물 순매수 확대',
    summary:
      '환율 안정이 외국인 위험 선호 회복과 대형주 수급 개선으로 이어졌습니다.',
    articleCount: 7,
    tags: ['환율', '수급', '대형주'],
    representativeArticle: {
      title: '원/달러 1,342원, 외국인 6일 연속 순매수',
      publisherName: '이데일리',
      publishedAt: '2026-07-26T16:48:00',
      originLink: 'https://example.com/article/fx-1',
      naverLink: null,
    },
  },
  {
    clusterId: 'f1c93b5e-7a26-4d80-b3e5-9a1f8c2d4067',
    title: '이차전지 업종 종목별 차별화',
    summary: '수주 잔고와 증설 일정에 따라 셀·소재 업종의 방향이 엇갈렸습니다.',
    articleCount: 5,
    tags: ['이차전지', '전기차'],
    representativeArticle: {
      title: '셀 3사 수주 잔고 격차 확대',
      publisherName: '조선비즈',
      publishedAt: '2026-07-26T15:26:00',
      originLink: 'https://example.com/article/batt-1',
      naverLink: null,
    },
  },
  {
    clusterId: '4a7e0d92-6f18-4b53-9c27-8e5d3a1b0f64',
    title: '코스닥 중소형주 차익 실현',
    summary:
      '단기 급등 종목 중심으로 개인 매도가 늘며 코스닥이 약세로 마감했습니다.',
    articleCount: 3,
    tags: ['코스닥', '수급'],
    representativeArticle: {
      title: '코스닥 개인 순매도 전환, 중소형주 조정',
      publisherName: '머니투데이',
      publishedAt: '2026-07-26T15:41:00',
      originLink: 'https://example.com/article/kq-1',
      naverLink: 'https://n.news.naver.com/article/kq1',
    },
  },
];

function articleLinks(clusters: ClusterCard[], seed: number): ArticleLink[] {
  const out: ArticleLink[] = [];
  clusters.forEach((c, ci) => {
    const n = Math.min(3, c.articleCount);
    rep(n, (i) => {
      out.push({
        ...article(i, seed + ci, {
          title:
            i === 0 ? (c.representativeArticle.title ?? undefined) : undefined,
        }),
        clusterId: c.clusterId,
        clusterTitle: c.title,
      });
    });
  });
  return out;
}

const US_ANALYSIS: MarketAnalysis = {
  background: [
    '대형 기술주 실적 기대가 지수 상단을 지지',
    '장기 금리 반등으로 장중 변동성 확대',
    '에너지·금융은 경기 지표를 소화하며 혼조',
  ],
  keyThemes: ['금리', 'AI 설비투자', '실적 시즌'],
  outlook:
    '다음 거래일에는 PCE 물가와 대형 기술주 실적이 방향을 결정할 변수다.',
};

const KR_ANALYSIS: MarketAnalysis = {
  background: [
    '반도체 업황 회복 기대와 외국인 순매수 유입',
    '원화 강세가 수급에 우호적으로 작용',
    '이차전지는 종목별 차별화가 이어짐',
  ],
  keyThemes: ['반도체', '외국인 수급', '환율'],
  outlook: '수출 지표 발표와 미국 금리 흐름이 대형주 수급의 변수로 남아 있다.',
};

type MarketOverrides = Partial<{
  clusters: ClusterCard[];
  indices: IndexCard[];
  summaryTitle: string | null;
  summaryBody: string | null;
  analysis: MarketAnalysis;
  articleLinks: ArticleLink[];
  rawNewsCount: number;
  processedNewsCount: number;
  clusterCount: number;
  partialMessage: string | null;
}>;

function market(type: MarketType, opts: MarketOverrides = {}): MarketSection {
  const isUs = type === 'US';
  const clusters = opts.clusters ?? (isUs ? US_CLUSTERS : KR_CLUSTERS);
  const indices = opts.indices ?? (isUs ? US_INDICES : KR_INDICES);
  return {
    marketType: type,
    marketLabel: isUs ? '미국 증시' : '한국 증시',
    summaryTitle:
      opts.summaryTitle !== undefined
        ? opts.summaryTitle
        : isUs
          ? '빅테크 실적 기대와 금리 경계가 교차'
          : '반도체 수급 개선과 외국인 매수세 유입',
    summaryBody:
      opts.summaryBody !== undefined
        ? opts.summaryBody
        : isUs
          ? '미국 시장은 주요 기술주의 실적 기대가 지수 상단을 지지했지만, 장기 금리 반등으로 장중 변동성이 확대되었습니다. 에너지와 금융 업종은 경기 지표를 소화하며 혼조세를 보였습니다.'
          : '한국 시장은 반도체 업황 회복 기대와 외국인 순매수에 힘입어 상승했습니다. 원화 강세가 수급에 우호적으로 작용했으나 이차전지 업종은 종목별 차별화가 이어졌습니다.',
    analysis: opts.analysis ?? (isUs ? US_ANALYSIS : KR_ANALYSIS),
    indices,
    topClusters: clusters,
    articleLinks: opts.articleLinks ?? articleLinks(clusters, isUs ? 1 : 5),
    metadata: {
      rawNewsCount: opts.rawNewsCount ?? (isUs ? 85 : 89),
      processedNewsCount: opts.processedNewsCount ?? (isUs ? 26 : 28),
      clusterCount: opts.clusterCount ?? clusters.length,
      lastUpdatedAt: '2026-07-27T06:12:10',
      partialMessage: opts.partialMessage ?? null,
    },
  };
}

const LONG_TOKEN =
  'GLOBALMARKETDAILYBRIEFSEMICONDUCTORSUPPLYCHAINRECOVERYANDFOREIGNNETBUYINGANALYSISREPORTVERSIONTHREEFINALDRAFTCONFIDENTIALINTERNALUSEONLYDONOTDISTRIBUTEOUTSIDEOFTHEORGANIZATION2026072712345678';
const LONG_URL =
  'https://research.example.com/reports/2026/07/global-market-daily-brief-semiconductor-supply-chain-recovery-and-foreign-net-buying-analysis-v3-final-confidential.pdf';

function basePage(overrides: Partial<DailyPage> = {}): DailyPage {
  return {
    pageId: 501,
    businessDate: '2026-07-26',
    versionNo: 3,
    pageTitle: '글로벌 시장 일간 요약 - 2026-07-26',
    status: 'READY',
    globalHeadline:
      '금리 경계 속 기술주 강세, 아시아는 반도체 수급 개선에 주목',
    generatedAt: '2026-07-27T06:12:10',
    partialMessage: null,
    markets: [market('US'), market('KR')],
    metadata: {
      rawNewsCount: 174,
      processedNewsCount: 114,
      clusterCount: 21,
      lastUpdatedAt: '2026-07-27T06:12:10',
      isLatest: true,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Daily page equivalence classes
// ---------------------------------------------------------------------------

export type PageMode =
  | 'ready'
  | 'partial'
  | 'failed'
  | 'emptyMarkets'
  | 'sparse'
  | 'long';

export function pageFixture(mode: string, businessDate?: string): DailyPage {
  const date = businessDate ?? '2026-07-26';
  const withDate = (p: DailyPage): DailyPage => ({
    ...p,
    businessDate: date,
    pageTitle: `글로벌 시장 일간 요약 - ${date}`,
    metadata: { ...p.metadata, isLatest: date === '2026-07-26' },
  });

  if (mode === 'partial') {
    return withDate(
      basePage({
        status: 'PARTIAL',
        partialMessage:
          '한국 증시 지수 2종과 미국 클러스터 요약 1건이 누락된 상태로 생성됐습니다.',
        markets: [
          market('US', {
            clusters: US_CLUSTERS.slice(0, 3),
            partialMessage:
              'AI 요약 1건이 생성되지 않아 클러스터 3건만 제공됩니다.',
            clusterCount: 3,
          }),
          market('KR', {
            indices: KR_INDICES.slice(0, 2),
            partialMessage:
              'KRX 300, USD/KRW 지수 수집이 provider 타임아웃으로 실패했습니다.',
            rawNewsCount: 41,
            processedNewsCount: 12,
          }),
        ],
        metadata: {
          rawNewsCount: 126,
          processedNewsCount: 74,
          clusterCount: 15,
          lastUpdatedAt: '2026-07-27T06:19:44',
          isLatest: true,
        },
      })
    );
  }

  if (mode === 'failed') {
    return withDate(
      basePage({
        status: 'FAILED',
        globalHeadline: null,
        partialMessage:
          '뉴스 수집 단계에서 실패해 이 날짜의 스냅샷이 완성되지 않았습니다.',
        markets: [],
        metadata: {
          rawNewsCount: 21,
          processedNewsCount: 0,
          clusterCount: 0,
          lastUpdatedAt: '2026-07-27T05:31:09',
          isLatest: true,
        },
      })
    );
  }

  if (mode === 'emptyMarkets') {
    return withDate(
      basePage({
        markets: [],
        metadata: {
          rawNewsCount: 0,
          processedNewsCount: 0,
          clusterCount: 0,
          lastUpdatedAt: '2026-07-27T06:12:10',
          isLatest: true,
        },
      })
    );
  }

  if (mode === 'sparse') {
    return withDate(
      basePage({
        globalHeadline: null,
        markets: [
          market('US', {
            summaryTitle: null,
            summaryBody: null,
            analysis: { background: [], keyThemes: [], outlook: null },
            indices: [],
            clusters: [],
            articleLinks: [],
            rawNewsCount: 12,
            processedNewsCount: 0,
            clusterCount: 0,
          }),
          market('KR', {
            clusters: KR_CLUSTERS.slice(0, 1),
            indices: KR_INDICES.slice(0, 1),
            articleLinks: [],
          }),
        ],
      })
    );
  }

  if (mode === 'long') {
    return withDate(
      basePage({
        globalHeadline: `금리 경계 속 기술주 강세와 아시아 반도체 수급 개선이 동시에 관측되며 지수 상·하단이 모두 확대된 하루였고 내부 리서치 코드 ${LONG_TOKEN} 로 추적된다`,
        markets: [
          market('US', {
            summaryBody:
              '미국 시장은 주요 기술주의 실적 기대가 지수 상단을 지지했지만 장기 금리 반등으로 장중 변동성이 확대되었습니다. 에너지와 금융 업종은 경기 지표를 소화하며 혼조세를 보였고, 반도체 업종은 AI 서버 수요와 차세대 칩 공개 기대가 동시에 반영되며 지수 대비 초과수익을 기록했습니다. 채권 시장에서는 10년물 금리가 장중 4.42%까지 상승한 뒤 되돌림을 보였으며, 이 과정에서 고밸류 성장주의 할인율 부담이 재차 부각되었습니다. 원문 리포트는 ' +
              LONG_URL +
              ' 에서 확인할 수 있고 내부 추적 코드는 ' +
              LONG_TOKEN +
              ' 입니다.',
            clusters: [
              {
                ...US_CLUSTERS[0],
                title: `연준 위원 발언 이후 장기 금리가 반등하며 성장주 할인율 부담이 재부각된 흐름 정리 (내부코드 ${LONG_TOKEN})`,
              },
              ...US_CLUSTERS.slice(1),
            ],
          }),
          market('KR'),
        ],
      })
    );
  }

  return withDate(basePage());
}

// ---------------------------------------------------------------------------
// Archive list
// ---------------------------------------------------------------------------

const ARCHIVE_HEADLINES = [
  '금리 경계 속 기술주 강세, 아시아는 반도체 수급 개선에 주목',
  '유가 하락과 달러 약세가 신흥국 위험 선호를 되살림',
  '실적 시즌 초반 빅테크 가이던스가 지수 방향을 좌우',
  '중국 지표 부진에 아시아 증시 동반 조정',
  '고용 지표 둔화로 금리 인하 기대가 재확산',
  '반도체 재고 조정 마무리 기대에 공급망 전반 강세',
  '지정학 리스크 완화로 방산·에너지 차익 실현',
];

function archiveItem(i: number): ArchiveItem {
  const date = shiftDate('2026-07-26', -i);
  const cycle = i % 11;
  const status: PageStatus =
    cycle === 3 ? 'PARTIAL' : cycle === 7 ? 'FAILED' : 'READY';
  return {
    pageId: 501 - i,
    businessDate: date,
    pageTitle: `글로벌 시장 일간 요약 - ${date}`,
    headlineSummary:
      status === 'FAILED'
        ? null
        : ARCHIVE_HEADLINES[i % ARCHIVE_HEADLINES.length],
    status,
    generatedAt: `${shiftDate(date, 1)}T06:${pad(8 + (i % 40))}:10`,
    partialMessage:
      status === 'PARTIAL'
        ? '한국 지수 2종 수집 실패로 부분 생성됐습니다.'
        : status === 'FAILED'
          ? '뉴스 수집 단계에서 provider 타임아웃이 발생했습니다.'
          : null,
  };
}

const ARCHIVE_ALL: ArchiveItem[] = rep(46, archiveItem);

export function archiveFixture(
  mode: string,
  page: number,
  size = 20,
  status = ''
): ArchiveList {
  const filtered = status
    ? ARCHIVE_ALL.filter((r) => r.status === status)
    : ARCHIVE_ALL;
  if (mode === 'noResults') {
    return { items: [], pagination: { page: 1, size, totalCount: 0 } };
  }
  const start = (page - 1) * size;
  return {
    items: filtered.slice(start, start + size),
    pagination: { page, size, totalCount: filtered.length },
  };
}

// ---------------------------------------------------------------------------
// Cluster detail
// ---------------------------------------------------------------------------

const CLUSTER_INDEX: Record<
  string,
  { marketType: MarketType; card: ClusterCard }
> = {};
[
  ...US_CLUSTERS.map((c): [MarketType, ClusterCard] => ['US', c]),
  ...KR_CLUSTERS.map((c): [MarketType, ClusterCard] => ['KR', c]),
].forEach(([mt, c]) => {
  CLUSTER_INDEX[c.clusterId] = { marketType: mt, card: c };
});

export function clusterFixture(mode: string, clusterId: string): ClusterDetail {
  const hit = CLUSTER_INDEX[clusterId] ?? {
    marketType: 'US' as MarketType,
    card: US_CLUSTERS[0],
  };
  const { card, marketType } = hit;
  const base: ClusterDetail = {
    clusterId: card.clusterId,
    businessDate: '2026-07-26',
    marketType,
    marketLabel: marketType === 'US' ? '미국 증시' : '한국 증시',
    title: card.title,
    tags: card.tags,
    summary: {
      short: card.summary,
      long: `${card.summary} 관련 기사 ${card.articleCount}건을 종합하면 시장은 단기 변동성보다 방향성 자체를 재확인하는 쪽으로 반응했습니다. 대표 기사와 관련 기사 발행 시각이 장 마감 직후에 집중되어 있어 종가 형성 이후의 해석이 반영된 것으로 보입니다.`,
      analysis: [
        '연방준비제도의 금리 인하 경로가 더 명확해졌다는 해석이 확산되며 고밸류 성장주에 대한 할인율 부담이 완화됐습니다.',
        '엔비디아와 AMD를 포함한 반도체 업종은 AI 서버 수요와 차세대 칩 공개 기대가 동시에 반영되며 지수 대비 초과수익을 기록했습니다.',
        '다만 장기 금리가 재차 상승할 경우 이번 강세의 근거가 약해질 수 있어, 다음 거래일의 물가 지표가 확인 포인트로 남습니다.',
      ],
    },
    articleCount: card.articleCount,
    lastUpdatedAt: '2026-07-27T06:12:10',
    representativeArticle: {
      processedArticleId: 2001,
      title: card.representativeArticle.title ?? '',
      publisherName: card.representativeArticle.publisherName ?? null,
      publishedAt: card.representativeArticle.publishedAt ?? null,
      originLink: card.representativeArticle.originLink ?? '',
      naverLink: card.representativeArticle.naverLink ?? null,
      sourceSummary: '경제·금융 전문 매체',
    },
    articles: rep(card.articleCount, (i) =>
      article(i, marketType === 'US' ? 1 : 5)
    ),
  };

  if (mode === 'sparse') {
    return {
      ...base,
      tags: [],
      summary: { short: null, long: null, analysis: [] },
      articleCount: 1,
      representativeArticle: {
        processedArticleId: null,
        title: '제목만 확보된 기사',
        publisherName: null,
        publishedAt: null,
        originLink: 'https://example.com/article/sparse',
        naverLink: null,
        sourceSummary: null,
      },
      articles: [
        {
          processedArticleId: null,
          title: '제목만 확보된 기사',
          publisherName: null,
          publishedAt: null,
          originLink: 'https://example.com/article/sparse',
          naverLink: null,
        },
      ],
    };
  }

  if (mode === 'heavy') {
    const heavyTags = [
      '반도체',
      'AI',
      '금리',
      '외국인',
      '수출',
      '환율',
      '실적',
      'Fed',
      'Treasury',
      'Capex',
      '메모리',
      'HBM',
      '파운드리',
      '설비투자',
      '가이던스',
      '재고',
      '수급',
      '대형주',
      'ETF',
      '옵션',
    ];
    return {
      ...base,
      tags: rep(20, (i) => heavyTags[i]),
      articleCount: 50,
      articles: rep(50, (i) => article(i, 3)),
    };
  }

  if (mode === 'long') {
    return {
      ...base,
      title: `${card.title} — 내부 추적 코드 ${LONG_TOKEN}`,
      summary: {
        ...base.summary,
        analysis: [
          ...base.summary.analysis,
          `원문 리포트: ${LONG_URL}`,
          LONG_TOKEN,
        ],
      },
    };
  }

  return base;
}

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------

/**
 * Per-jobType pipeline stage KEYS — the snake_case identifiers from the
 * design source (`docs/design_v2/handoff_v2/fixtures.js:418-434`'s
 * `BATCH_STAGES`, whose entries carry both a `key` and a Korean `label`).
 * Kept as a second, independent copy on purpose (see this file's header
 * comment on why it's an "independent port," not an import).
 *
 * Deliberately the `key` form, not the Korean `label`: the OpenAPI spec
 * gives `currentStep` no enum/example, but the same design source's log
 * fixtures print `step=load_search_result`, so a snake_case key is the more
 * likely real wire value. `src/lib/batch-type.ts` matches `currentStep`
 * against BOTH key and label, and the unit tests cover the label path — so
 * emitting keys here makes the visual-audit harness exercise the path the
 * real backend most likely takes. Still a best-effort stand-in, not a
 * confirmed wire value.
 */
const BATCH_STAGE_KEYS: Readonly<Record<BatchJobType, readonly string[]>> = {
  NEWS_COLLECTION: [
    'create_job',
    'collect_news',
    'collect_market_indices',
    'dedupe_articles',
    'persist_search_result',
    'finalize_job',
  ],
  MARKET_SNAPSHOT: [
    'create_job',
    'load_search_result',
    'build_clusters',
    'generate_ai_summaries',
    'build_page_snapshot',
    'finalize_job',
  ],
};

function jobStatusFor(i: number, jobType: BatchJobType): BatchJobStatus {
  // Offset the two types' cycles so a NEWS_COLLECTION and MARKET_SNAPSHOT
  // job for the same businessDate don't always land on the same status —
  // otherwise every jobType-filtered view would look identical apart from
  // the label, which would defeat the point of testing the filter.
  const isSnapshot = jobType === 'MARKET_SNAPSHOT';
  if (i === 0) return isSnapshot ? 'RUNNING' : 'SUCCESS';
  const cycle = (isSnapshot ? i : i + 4) % 9;
  if (cycle === 2) return 'PARTIAL';
  if (cycle === 5) return 'FAILED';
  return 'SUCCESS';
}

/**
 * `currentStep` for a generated item. RUNNING lands mid-pipeline (never the
 * first/last stage, so the "실행 중" dot in `PipelineStages` has something
 * real to point at); a finished job reports its last stage; a FAILED job
 * reports `null` — the app's FAILED path still infers the failed stage from
 * `errorCode` keywords (`pipeline-stages.tsx`'s `inferFailedStageIndex`),
 * unchanged by this jobType pass, so `currentStep` is never consulted there.
 */
function currentStepFor(
  status: BatchJobStatus,
  jobType: BatchJobType,
  i: number
): string | null {
  const stages = BATCH_STAGE_KEYS[jobType];
  if (status === 'RUNNING' || status === 'PARTIAL') {
    return stages[1 + (i % (stages.length - 2))];
  }
  if (status === 'SUCCESS') {
    return stages[stages.length - 1];
  }
  return null;
}

function batchItem(
  i: number,
  jobType: BatchJobType,
  jobId: number
): BatchListItem {
  const businessDate = shiftDate('2026-07-26', -i);
  const status = jobStatusFor(i, jobType);
  const isSnapshot = jobType === 'MARKET_SNAPSHOT';
  const failed = status === 'FAILED';
  const running = status === 'RUNNING';
  const partial = status === 'PARTIAL';
  const hh = isSnapshot ? '07' : '06';
  const mm = 10 + (i % 20);
  const duration = running
    ? null
    : failed
      ? isSnapshot
        ? 14
        : 69
      : partial
        ? isSnapshot
          ? 268
          : 372
        : (isSnapshot ? 96 : 152) + ((i * 17) % 80);
  const endMinute = mm + Math.floor((duration ?? 0) / 60);
  return {
    jobId,
    jobType,
    jobName: isSnapshot ? 'market_snapshot_batch' : 'news_collection_batch',
    businessDate,
    status,
    currentStep: currentStepFor(status, jobType, i),
    startedAt: `${shiftDate(businessDate, 1)}T${hh}:${pad(mm)}:00`,
    endedAt: running
      ? null
      : `${shiftDate(businessDate, 1)}T${hh}:${pad(endMinute)}:${pad((duration ?? 0) % 60)}`,
    durationSeconds: duration,
    marketScope: 'GLOBAL',
    // `BatchJobListItemResponse` (docs/api_spec.json) declares all three
    // count fields as non-nullable required integers — unlike the design
    // source (`fixtures.js:466-470`), which uses `null` for the field that
    // doesn't apply to a given jobType. Mirrored here with 0 instead of
    // null to stay spec-accurate: NEWS_COLLECTION collects raw/processed
    // news and never clusters (clusterCount stays 0); MARKET_SNAPSHOT
    // consumes already-collected news (processedNewsCount = input count
    // read) and never touches raw articles (rawNewsCount stays 0).
    rawNewsCount: isSnapshot ? 0 : failed ? 21 : partial ? 126 : 174 - (i % 30),
    processedNewsCount: failed ? 0 : partial ? 74 : 114 - (i % 22),
    clusterCount: isSnapshot ? (failed ? 0 : partial ? 15 : 21 - (i % 6)) : 0,
    pageId: isSnapshot && !failed ? 501 - i : null,
    pageVersionNo: isSnapshot && !failed ? 3 - (i % 2) : null,
    partialMessage: partial
      ? isSnapshot
        ? '미국 클러스터 1건 AI 요약 미생성'
        : '한국 지수 2종 수집 실패 (원문 저장은 완료)'
      : null,
  };
}

// 같은 기준일에 검색 결과 저장(NEWS_COLLECTION) → 스냅샷 생성
// (MARKET_SNAPSHOT) 순으로 실행되므로 목록은 스냅샷이 위에 온다 — 디자인
// 소스(`fixtures.js:480-490`)와 동일한 interleaving.
const BATCH_ALL: BatchListItem[] = (() => {
  const out: BatchListItem[] = [];
  let id = 1042;
  for (let i = 0; i < 27; i += 1) {
    out.push(batchItem(i, 'MARKET_SNAPSHOT', id));
    out.push(batchItem(i, 'NEWS_COLLECTION', id - 1));
    id -= 2;
  }
  return out;
})();

export function batchListFixture(
  mode: string,
  page: number,
  size = 20,
  status = '',
  jobType = ''
): BatchList {
  if (mode === 'empty') {
    return {
      items: [],
      pagination: { page: 1, size, totalCount: 0 },
      summary: {
        successCount: 0,
        partialCount: 0,
        failedCount: 0,
        avgDurationSeconds: 0,
      },
    };
  }
  // `scoped` = jobType-filtered but NOT status-filtered — the summary tiles
  // count statuses WITHIN the applied type scope, matching the design
  // source's own `batchListFixture` (`fixtures.js:498-511`, its `scoped`
  // var). Filtering `scoped` again by status before counting statuses
  // would make every summary count read as either 0 or "all of them."
  const scoped = jobType
    ? BATCH_ALL.filter((r) => r.jobType === jobType)
    : BATCH_ALL;
  const filtered = status ? scoped.filter((r) => r.status === status) : scoped;
  const start = (page - 1) * size;
  const done = scoped.filter(
    (r): r is BatchListItem & { durationSeconds: number } =>
      r.durationSeconds !== null
  );
  return {
    items: filtered.slice(start, start + size),
    pagination: { page, size, totalCount: filtered.length },
    summary: {
      successCount: scoped.filter((r) => r.status === 'SUCCESS').length,
      partialCount: scoped.filter((r) => r.status === 'PARTIAL').length,
      failedCount: scoped.filter((r) => r.status === 'FAILED').length,
      avgDurationSeconds: done.length
        ? Math.round(
            done.reduce((a, r) => a + r.durationSeconds, 0) / done.length
          )
        : 0,
    },
  };
}

const LONG_LOG = (() => {
  const lines = [
    'step=collect_news provider=naver keyword_group=us_market status=timeout elapsed_ms=10014 retry=3/3',
    'step=collect_news provider=naver keyword_group=us_market request_id=req-20260727-0141 http_status=504',
    'Traceback (most recent call last):',
    '  File "/app/app/batch/steps/collect_news.py", line 118, in run',
    '    payload = await self._provider.search(keyword=keyword, display=100, start=offset)',
    '  File "/app/app/batch/providers/naver_news.py", line 74, in search',
    '    response = await self._client.get(url, params=params, timeout=self._timeout)',
    'httpx.ReadTimeout: The read operation timed out after 10.0 seconds',
    'step=collect_news outcome=aborted collected=21 expected_min=60 policy=batch_status_policy.FAILED',
    'step=collect_market_indices status=skipped reason=upstream_step_failed',
    'step=dedupe_articles status=skipped reason=upstream_step_failed',
    'step=build_clusters status=skipped reason=upstream_step_failed',
    'step=generate_ai_summaries status=skipped reason=upstream_step_failed',
    'step=build_page_snapshot status=skipped reason=upstream_step_failed page_id=None',
    'step=finalize_job status=FAILED error_code=NEWS_SOURCE_TIMEOUT retryable=true',
  ];
  let out = '';
  let i = 0;
  while (out.length < 4000) {
    out += `2026-07-27T06:${pad(10 + (i % 40))}:${pad(i % 60)} ${lines[i % lines.length]}\n`;
    i += 1;
  }
  return out;
})();

/**
 * A job just created by `POST /stock/api/batch/market-daily` (mock
 * `jobId: 1043`, see `triggerResult()`) isn't one of `BATCH_ALL`'s 27 seeded
 * historical rows — a real backend WOULD return it (it just started), but
 * this static fixture set has no such entry. Falling back to `BATCH_ALL[0]`
 * (as this function used to, unconditionally) silently mislabels the
 * response: it would report itself as `jobId: 1042` (a different, unrelated
 * job) while being served FOR a request that asked for 1043. Synthesizing a
 * plausible RUNNING record for any unseeded jobId instead keeps the
 * response's own `jobId` truthful for §16-10's "작업 상세 보기"/"작업 보기"
 * navigation after a successful Trigger. Always MARKET_SNAPSHOT: the only
 * in-scope trigger endpoint (`/batch/market-daily`) has no jobType concept
 * of its own (`BatchRunResponse` carries no `jobType` field — confirmed
 * against `docs/api_spec.json`); `POST /batch/news-collection` is a
 * separate, out-of-scope trigger this mock doesn't wire up.
 */
function syntheticRunningJob(jobId: number): BatchListItem {
  const jobType: BatchJobType = 'MARKET_SNAPSHOT';
  return {
    jobId,
    jobType,
    jobName: 'market_daily_batch',
    businessDate: TODAY,
    status: 'RUNNING',
    currentStep: BATCH_STAGE_KEYS[jobType][1],
    startedAt: NOW_KST,
    endedAt: null,
    durationSeconds: null,
    marketScope: 'GLOBAL',
    rawNewsCount: 0,
    processedNewsCount: 0,
    clusterCount: 0,
    pageId: null,
    pageVersionNo: null,
    partialMessage: null,
  };
}

export function batchDetailFixture(jobId: number, mode?: string): BatchDetail {
  const item =
    BATCH_ALL.find((r) => r.jobId === jobId) ?? syntheticRunningJob(jobId);
  const failed = item.status === 'FAILED';
  const partial = item.status === 'PARTIAL';
  const isSnapshot = item.jobType === 'MARKET_SNAPSHOT';
  // Distinct per-type errorCode so `pipeline-stages.tsx`'s errorCode->stage
  // keyword table (unchanged by this pass) actually resolves to a stage
  // that exists in THIS job's 6-stage list: /NEWS/ -> '뉴스 수집' (only in
  // NEWS_COLLECTION's list), /SUMMARY|AI|LLM|GPT/ -> 'AI 요약 생성' (only
  // in MARKET_SNAPSHOT's list).
  const errorCode = failed
    ? isSnapshot
      ? 'AI_SUMMARY_TIMEOUT'
      : 'NEWS_SOURCE_TIMEOUT'
    : null;
  const errorMessage = failed
    ? isSnapshot
      ? 'AI 요약 생성 단계에서 응답 제한 시간을 초과했습니다. 재시도 3회를 모두 소진한 뒤 작업이 중단됐습니다.'
      : '원문 공급자 응답 제한 시간을 초과했습니다. 재시도 3회를 모두 소진한 뒤 작업이 중단됐습니다.'
    : null;

  return {
    jobId: item.jobId,
    jobType: item.jobType,
    jobName: item.jobName,
    businessDate: item.businessDate,
    status: item.status,
    currentStep: item.currentStep,
    startedAt: item.startedAt,
    endedAt: item.endedAt,
    durationSeconds: item.durationSeconds,
    partialMessage: item.partialMessage,
    errorCode,
    errorMessage,
    logSummary: failed
      ? mode === 'longLog'
        ? LONG_LOG
        : LONG_LOG.slice(0, 1200)
      : partial
        ? isSnapshot
          ? '미국 클러스터 1건 AI 요약이 누락된 상태로 페이지 스냅샷을 생성했습니다.'
          : '한국 지수 2종 수집에 실패했지만 원문 저장은 완료했습니다.'
        : '정상 처리. SLA 안에서 종료됐습니다.',
    // `docs/api_spec.json`의 `BatchJobDetailResponse`는 이 둘을 서로
    // 배타적인 nullable 중첩 객체로 정의한다 — MARKET_SNAPSHOT 작업은
    // snapshot만, NEWS_COLLECTION 작업은 newsCollection만 채워진다(둘 다
    // null인 경우는 이 픽스처에서 만들지 않는다).
    snapshot: isSnapshot
      ? {
          forceRun: item.jobId % 4 === 0,
          rebuildPageOnly: false,
          rawNewsCount: item.rawNewsCount,
          processedNewsCount: item.processedNewsCount,
          clusterCount: item.clusterCount,
          pageId: item.pageId,
          pageVersionNo: item.pageVersionNo,
        }
      : null,
    newsCollection: isSnapshot
      ? null
      : {
          runId: item.jobId,
          providerName: 'naver',
          windowStartAt: item.startedAt,
          windowEndAt: item.endedAt ?? item.startedAt,
          queryStartAt: item.startedAt,
          queryEndAt: item.endedAt ?? item.startedAt,
          totalKeywordCount: 40,
          completedKeywordCount: failed ? 12 : 40,
          fetchedCount: item.rawNewsCount,
          matchedCount: item.processedNewsCount,
          insertedCount: item.processedNewsCount,
          coverageComplete: !failed,
        },
  };
}

export function triggerResult(
  mode: string,
  businessDate?: string
): TriggerResult {
  const base: TriggerSuccess = {
    jobId: 1043,
    jobName: 'market_daily_batch',
    businessDate: businessDate || TODAY,
    status: 'RUNNING',
    startedAt: '2026-07-27T08:24:31',
  };
  if (mode === 'conflict409') {
    return {
      error: {
        http: 409,
        code: 'BATCH_ALREADY_RUNNING',
        message: `${businessDate || TODAY} 배치가 이미 실행 중입니다.`,
        existingJobId: 1042,
      },
    };
  }
  if (mode === 'forbidden403') {
    return {
      error: {
        http: 403,
        code: 'FORBIDDEN',
        message: '수동 실행 권한이 없습니다. 관리자(ADMIN) 권한이 필요합니다.',
      },
    };
  }
  if (mode === 'validation422') {
    return {
      error: {
        http: 422,
        code: 'INVALID_BUSINESS_DATE',
        message: '미래 날짜는 실행할 수 없습니다.',
        field: 'businessDate',
      },
    };
  }
  if (mode === 'rate429') {
    return {
      error: {
        http: 429,
        code: 'RATE_LIMITED',
        message: '요청이 너무 많습니다. 60초 후 다시 시도해 주세요.',
        retryAfter: 60,
      },
    };
  }
  if (mode === 'error500') {
    return {
      error: {
        http: 500,
        code: 'INTERNAL_BATCH_ERROR',
        message: '배치 실행 요청을 처리하지 못했습니다.',
      },
    };
  }
  if (mode === 'offline') {
    return {
      error: {
        http: 0,
        code: 'NETWORK_ERROR',
        message: '네트워크에 연결할 수 없습니다.',
      },
    };
  }
  return { data: base };
}

export function aiRetryResult(
  mode: string,
  sourceJobId: number,
  idempotencyKey: string | null
): AiRetryResult {
  const source = BATCH_ALL.find((item) => item.jobId === sourceJobId);
  const base: AiRetrySuccess = {
    jobId: 1043,
    jobName: 'market_snapshot_ai_retry',
    businessDate: source?.businessDate ?? TODAY,
    status: 'RUNNING',
    runMode: 'AI_SUMMARY_RETRY',
    sourceJobId,
    sourcePageId: source?.pageId ?? null,
    idempotencyKey,
    startedAt: NOW_KST,
  };

  if (mode === 'conflict409') {
    return {
      error: {
        http: 409,
        code: 'AI_RETRY_IN_PROGRESS',
        message: 'AI 요약 재시도가 이미 진행 중입니다.',
      },
    };
  }

  if (mode === 'forbidden403') {
    return {
      error: {
        http: 403,
        code: 'FORBIDDEN',
        message: 'AI 요약 재시도 권한이 없습니다.',
      },
    };
  }

  if (mode === 'error500') {
    return {
      error: {
        http: 500,
        code: 'AI_RETRY_FAILED',
        message: 'AI 요약 재시도 요청을 처리하지 못했습니다.',
      },
    };
  }

  if (mode === 'offline') {
    return {
      error: {
        http: 0,
        code: 'NETWORK_ERROR',
        message: '네트워크에 연결할 수 없습니다.',
      },
    };
  }

  return { data: base };
}

// ---------------------------------------------------------------------------
// Error equivalence classes
// ---------------------------------------------------------------------------

export type ErrorFixture = {
  http: number;
  code: string;
  title: string;
  message: string;
  action: string;
};

export const ERRORS: Record<string, ErrorFixture> = {
  error401: {
    http: 401,
    code: 'SESSION_EXPIRED',
    title: '세션이 만료됐습니다',
    message: '다시 로그인하면 마지막으로 보던 화면으로 돌아옵니다.',
    action: '다시 로그인',
  },
  error403: {
    http: 403,
    code: 'FORBIDDEN',
    title: '이 화면에 접근할 권한이 없습니다',
    message: '운영 화면은 관리자(ADMIN) 권한이 있는 계정만 열 수 있습니다.',
    action: '최신 브리프로 이동',
  },
  error404: {
    http: 404,
    code: 'PAGE_NOT_FOUND',
    title: '해당 날짜의 스냅샷이 없습니다',
    message: '배치가 실행되지 않았거나 실패한 날짜일 수 있습니다.',
    action: '아카이브에서 찾기',
  },
  clusterNotFound: {
    http: 404,
    code: 'CLUSTER_NOT_FOUND',
    title: '이 이슈를 찾을 수 없습니다',
    message: '클러스터가 재생성되면서 ID가 변경됐을 수 있습니다.',
    action: '해당 날짜 브리프로 이동',
  },
  error429: {
    http: 429,
    code: 'RATE_LIMITED',
    title: '요청이 너무 많습니다',
    message: '60초 후 자동으로 다시 시도합니다.',
    action: '지금 다시 시도',
  },
  error500: {
    http: 500,
    code: 'INTERNAL_ERROR',
    title: '데이터를 불러오지 못했습니다',
    message: '서버가 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    action: '다시 시도',
  },
  offline: {
    http: 0,
    code: 'NETWORK_ERROR',
    title: '네트워크에 연결할 수 없습니다',
    message:
      '연결을 확인한 뒤 다시 시도해 주세요. 마지막으로 불러온 내용은 아래에 그대로 유지됩니다.',
    action: '다시 시도',
  },
  malformed: {
    http: 200,
    code: 'MALFORMED_RESPONSE',
    title: '응답 형식이 올바르지 않습니다',
    message:
      'markets 배열이 없는 응답을 받았습니다. 배치 상태를 확인해 주세요.',
    action: '배치 상태 열기',
  },
};

export const LONG_SAMPLES: { token: string; url: string; log: string } = {
  token: LONG_TOKEN,
  url: LONG_URL,
  log: LONG_LOG,
};

// ---------------------------------------------------------------------------
// Playwright network routing
// ---------------------------------------------------------------------------

/** §16 scenario keys required by the Phase 8 overflow sweep (README §11/§16-13). */
export type Scenario =
  | 'ready'
  | 'partial'
  | 'failed'
  | 'emptyMarkets'
  | 'sparse'
  | 'long'
  | 'error5xx'
  | 'loading';

export type InstallMockApiOptions = {
  scenario: Scenario;
  /** `businessDate` used by `/pages/daily/latest` (prototype convention: the "latest" snapshot is dated 2026-07-26, one day behind `TODAY`). */
  latestBusinessDate?: string;
  /** Archive SEARCH list result mode — independent of `scenario` because §16-13 needs both "results" and "0 results" under the same otherwise-`ready` scenario. */
  archiveSearchMode?: 'results' | 'noResults';
  /** Cluster detail fixture mode — independent of `scenario` because `long` (unbroken token/URL) and `heavy` (50 articles/20 tags) are different equivalence classes in `fixtures.js`. Defaults from `scenario` when omitted. */
  clusterMode?: 'sparse' | 'heavy' | 'long';
  /** Batch detail log mode — `'longLog'` forces the full 4,000-char log (only takes effect for a FAILED job; see `batchDetailFixture`). Defaults from `scenario`. */
  batchDetailMode?: 'longLog';
  /**
   * Phase 9 §16-11 (permissions). Exercises the REAL role source
   * (`src/lib/capabilities.ts#getRole()` reads `auth-bootstrap.ts`'s parsed
   * `roles`, which come from the `POST /api/users/token` response body's
   * `roleList` field — see `readRoleList()` in that file) instead of a
   * test-only override. `'admin'` emits `roleList: ['USER', 'ADMIN']`;
   * `'user'` emits `roleList: ['USER']`. Omitted -> the token endpoint
   * response carries no `roleList` field at all, so `getRole()` falls
   * through to its own default ('admin' under this suite's
   * `VITE_APP_ENV=development` — see that file's doc comment), preserving
   * every pre-existing test's behavior unchanged.
   */
  role?: 'user' | 'admin';
  /**
   * Phase 9 §16-10 (Trigger lifecycle). Selects what `POST
   * /stock/api/batch/market-daily` resolves to; mirrors `triggerResult()`'s
   * mode strings one-to-one. Defaults to `'success'` (the pre-existing
   * hardcoded behavior). `'offline'` genuinely `route.abort()`s instead of
   * fulfilling a body, so it produces a real Playwright `requestfailed`
   * event and a real `fetch()` rejection — the same failure mode a
   * disconnected network would produce — rather than faking status 0 through
   * a JSON body (which `route.fulfill` cannot even represent: HTTP status
   * codes below 100 are invalid).
   */
  triggerMode?:
    | 'success'
    | 'conflict409'
    | 'forbidden403'
    | 'validation422'
    | 'rate429'
    | 'error500'
    | 'offline';
  /** Phase 1c AI-summary retry lifecycle. Defaults to an accepted 202 response. */
  retryAiMode?:
    | 'success'
    | 'conflict409'
    | 'forbidden403'
    | 'error500'
    | 'offline';
};

function envelope<T>(data: T): ApiEnvelope<T> {
  return {
    success: true,
    data,
    meta: { requestId: 'req-e2e-mock', timestamp: NOW_KST },
  };
}

async function fulfillJson(
  route: Route,
  status: number,
  body: unknown
): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function queryNumber(url: URL, key: string, fallback: number): number {
  const raw = url.searchParams.get(key);
  const parsed = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function serverErrorEnvelope() {
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '서버가 요청을 처리하지 못했습니다.',
    },
  };
}

/** Modes that pass through unchanged to `pageFixture`/`clusterFixture`, one per scenario. */
const PAGE_MODE_BY_SCENARIO: Partial<Record<Scenario, string>> = {
  partial: 'partial',
  failed: 'failed',
  emptyMarkets: 'emptyMarkets',
  sparse: 'sparse',
  long: 'long',
};

const CLUSTER_MODE_BY_SCENARIO: Partial<
  Record<Scenario, 'sparse' | 'heavy' | 'long'>
> = {
  sparse: 'sparse',
  long: 'long',
};

/**
 * Installs the mock API for a single Playwright `page`. Every request the
 * app makes for `**\/stock/api/**` (and the auth bootstrap token endpoint) is
 * intercepted — nothing reaches a real network socket, so the E2E run never
 * depends on (or accidentally hits) a real backend.
 */
export async function installMockApi(
  page: Page,
  options: InstallMockApiOptions
): Promise<void> {
  const {
    scenario,
    latestBusinessDate = '2026-07-26',
    archiveSearchMode = 'results',
  } = options;
  const pageMode = PAGE_MODE_BY_SCENARIO[scenario] ?? 'ready';
  const clusterMode =
    options.clusterMode ?? CLUSTER_MODE_BY_SCENARIO[scenario] ?? 'ready';
  const batchDetailMode =
    options.batchDetailMode ?? (scenario === 'long' ? 'longLog' : undefined);
  const triggerMode = options.triggerMode ?? 'success';
  const retryAiMode = options.retryAiMode ?? 'success';

  // Auth bootstrap (`src/lib/auth-bootstrap.ts`): fulfilling a real 200 body
  // (rather than aborting the request) exercises the REAL integration path —
  // `bootstrapAuth()` -> `readAccessToken`/`readRoleList()` ->
  // `capabilities.ts`'s `getRole()` — instead of a test-only role backdoor
  // (README §16-11). The body matches the settled backend contract
  // (docs/design_v2/v2-backend-requests.md P-01): `accessToken` + `username`
  // + `name` + `roleList`. `roleList` is only present when `options.role` is
  // given (`'admin'` -> `['USER', 'ADMIN']`, `'user'` -> `['USER']`); omitted
  // entirely otherwise so `readRoleList()` returns `[]` and `getRole()`
  // falls through to its own default ('admin' under this suite's
  // `VITE_APP_ENV=development`), which is exactly the previous (abort ->
  // dev-bypass -> 'operator', now 'admin') outcome for every test that
  // doesn't pass `role` — see `capabilities.ts`'s `getDefaultRole()` doc
  // comment.
  const roleListByOption: Record<'user' | 'admin', string[]> = {
    user: ['USER'],
    admin: ['USER', 'ADMIN'],
  };

  await page.route('**/api/users/token', async (route) => {
    await fulfillJson(route, 200, {
      accessToken: 'mock-e2e-access-token',
      username: 'e2e.tester',
      name: 'E2E Tester',
      ...(options.role ? { roleList: roleListByOption[options.role] } : {}),
    });
  });

  await page.route('**/stock/api/**', async (route) => {
    if (scenario === 'loading') {
      // Deliberately unresolved for a long time — used to assert the
      // loading-skeleton layout doesn't overflow (the assertion itself runs
      // within ~1s of navigation). Bounded at 20s rather than truly eternal
      // (`new Promise(() => {})`): an eternal promise pins this route
      // handler in memory for the rest of the Node process's life even
      // after the page/context closes, which is a real leak risk across a
      // 100+-test run in the same worker. `.catch(() => {})` guards the
      // rare case where the route is already gone by the time the timer
      // fires (page/context closed before 20s elapsed).
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      await route.abort('timedout').catch(() => {});
      return;
    }

    if (scenario === 'error5xx') {
      await fulfillJson(route, 500, serverErrorEnvelope());
      return;
    }

    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (method === 'GET' && pathname === '/stock/api/pages/daily/latest') {
      await fulfillJson(
        route,
        200,
        envelope(pageFixture(pageMode, latestBusinessDate))
      );
      return;
    }

    if (method === 'GET' && pathname === '/stock/api/pages/daily') {
      const businessDate =
        url.searchParams.get('businessDate') ?? latestBusinessDate;
      await fulfillJson(
        route,
        200,
        envelope(pageFixture(pageMode, businessDate))
      );
      return;
    }

    const pageIdMatch = /^\/stock\/api\/pages\/(\d+)$/.exec(pathname);
    if (method === 'GET' && pageIdMatch) {
      // §16-6 deep link (`?pageId=`): derive the businessDate that this
      // pageId "belongs to" using the SAME formula `archiveItem()` above
      // uses to seed `ARCHIVE_ALL` (`pageId = 501 - i`, `businessDate =
      // shiftDate('2026-07-26', -i)`), inverted. Previously this always
      // returned `latestBusinessDate` regardless of the requested pageId, so
      // `?pageId=481` on `/market/archive/2026-07-06` silently rendered the
      // 2026-07-26 snapshot instead — a mock bug, not an app bug (the app
      // correctly requests `/stock/api/pages/481`; the mock just always
      // answered with the wrong day).
      const pageId = Number(pageIdMatch[1]);
      const businessDate = shiftDate('2026-07-26', pageId - 501);
      await fulfillJson(
        route,
        200,
        envelope(pageFixture(pageMode, businessDate))
      );
      return;
    }

    if (method === 'GET' && pathname === '/stock/api/pages/archive') {
      const page_ = queryNumber(url, 'page', 1);
      const size = queryNumber(url, 'size', 20);
      const status = url.searchParams.get('status') ?? '';
      const mode = archiveSearchMode === 'noResults' ? 'noResults' : 'ready';
      await fulfillJson(
        route,
        200,
        envelope(archiveFixture(mode, page_, size, status))
      );
      return;
    }

    const clusterMatch = /^\/stock\/api\/news\/clusters\/([^/]+)$/.exec(
      pathname
    );
    if (method === 'GET' && clusterMatch) {
      await fulfillJson(
        route,
        200,
        envelope(clusterFixture(clusterMode, clusterMatch[1]))
      );
      return;
    }

    if (method === 'GET' && pathname === '/stock/api/batch/jobs') {
      const page_ = queryNumber(url, 'page', 1);
      const size = queryNumber(url, 'size', 20);
      const status = url.searchParams.get('status') ?? '';
      const jobType = url.searchParams.get('jobType') ?? '';
      await fulfillJson(
        route,
        200,
        envelope(batchListFixture('ready', page_, size, status, jobType))
      );
      return;
    }

    const batchJobIdMatch = /^\/stock\/api\/batch\/jobs\/(\d+)$/.exec(pathname);
    if (method === 'GET' && batchJobIdMatch) {
      const jobId = Number(batchJobIdMatch[1]);
      await fulfillJson(
        route,
        200,
        envelope(batchDetailFixture(jobId, batchDetailMode))
      );
      return;
    }

    const retryAiMatch = /^\/stock\/api\/batch\/jobs\/(\d+)\/retry-ai$/.exec(
      pathname
    );
    if (method === 'POST' && retryAiMatch) {
      const sourceJobId = Number(retryAiMatch[1]);
      const idempotencyKey =
        request.headers()['idempotency-key']?.trim() || null;

      // Keep the pending state observable in browser tests, just like the
      // manual trigger fixture above.
      await new Promise((resolve) => setTimeout(resolve, 300));

      const result = aiRetryResult(retryAiMode, sourceJobId, idempotencyKey);

      if ('error' in result) {
        if (retryAiMode === 'offline') {
          await route.abort('internetdisconnected');
          return;
        }

        await fulfillJson(route, result.error.http, {
          success: false,
          error: result.error,
        });
        return;
      }

      await fulfillJson(route, 202, envelope(result.data));
      return;
    }

    if (method === 'POST' && pathname === '/stock/api/batch/market-daily') {
      let requestedBusinessDate: string | undefined;
      try {
        const body = request.postDataJSON() as { businessDate?: unknown };
        requestedBusinessDate =
          typeof body?.businessDate === 'string'
            ? body.businessDate
            : undefined;
      } catch {
        requestedBusinessDate = undefined;
      }

      // Small artificial delay so the dialog's "pending" state (README
      // §7-7) is actually observable by a test — an instantly-resolving
      // mock would make idle -> pending -> success/error indistinguishable
      // from idle -> success/error in a real assertion.
      await new Promise((resolve) => setTimeout(resolve, 300));

      const result = triggerResult(triggerMode, requestedBusinessDate);

      if ('error' in result) {
        if (triggerMode === 'offline') {
          // A genuine network-level failure (real `requestfailed` event,
          // real `fetch()` rejection) rather than a JSON body — `route
          // .fulfill({status: 0})` isn't valid (HTTP status codes below 100
          // are rejected), and faking it any other way wouldn't exercise the
          // same `apiRequest()` catch path (`client.ts`) a real offline
          // client hits.
          await route.abort('internetdisconnected');
          return;
        }

        await fulfillJson(route, result.error.http, {
          success: false,
          error: result.error,
        });
        return;
      }

      await fulfillJson(route, 200, envelope(result.data));
      return;
    }

    await fulfillJson(route, 404, {
      success: false,
      error: {
        code: 'MOCK_ROUTE_NOT_FOUND',
        message: `No mock handler for ${method} ${pathname}`,
      },
    });
  });
}
