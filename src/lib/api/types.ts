export type ApiEnvelope<T> = {
  success?: boolean;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
};

type PaginationResponse = {
  page: number;
  size: number;
  totalCount: number;
};

export type DailyPageResponse = {
  pageId: number;
  businessDate: string;
  versionNo: number;
  pageTitle: string;
  status: string;
  globalHeadline: string | null;
  generatedAt: string;
  partialMessage: string | null;
  markets: MarketSectionResponse[];
  metadata: {
    rawNewsCount: number;
    processedNewsCount: number;
    clusterCount: number;
    lastUpdatedAt: string;
  };
};

type MarketSectionResponse = {
  marketType: string;
  marketLabel: string;
  summaryTitle: string | null;
  summaryBody: string | null;
  analysis: {
    background: string[];
    keyThemes: string[];
    outlook: string | null;
  };
  indices: IndexCardResponse[];
  topClusters: ClusterCardResponse[];
  articleLinks: ArticleLinkResponse[];
  metadata: {
    rawNewsCount: number;
    processedNewsCount: number;
    clusterCount: number;
    lastUpdatedAt: string;
    partialMessage: string | null;
  };
};

export type IndexCardResponse = {
  indexCode: string;
  indexName: string;
  closePrice: string;
  changeValue: string;
  changePercent: string;
  highPrice: string | null;
  lowPrice: string | null;
};

type ClusterCardResponse = {
  clusterId: string;
  title: string;
  summary: string | null;
  articleCount: number;
  tags: string[];
  representativeArticle: RepresentativeArticleResponse;
};

type RepresentativeArticleResponse = {
  title?: string | null;
  publisherName?: string | null;
  publishedAt?: string | null;
  originLink?: string | null;
  naverLink?: string | null;
};

export type ArticleLinkResponse = {
  processedArticleId?: number | null;
  clusterId?: string | null;
  clusterTitle?: string | null;
  title: string;
  publisherName?: string | null;
  publishedAt?: string | null;
  originLink: string;
  naverLink?: string | null;
};

type ArchiveItemResponse = {
  pageId: number;
  businessDate: string;
  pageTitle: string;
  headlineSummary: string | null;
  status: string;
  generatedAt: string;
  partialMessage: string | null;
};

export type ArchiveListResponse = {
  items: ArchiveItemResponse[];
  pagination: PaginationResponse;
};

export type ClusterArticleResponse = {
  processedArticleId?: number | null;
  title: string;
  publisherName?: string | null;
  publishedAt?: string | null;
  originLink: string;
  naverLink?: string | null;
  sourceSummary?: string | null;
};

export type ClusterDetailResponse = {
  clusterId: string;
  businessDate: string;
  marketType: string;
  marketLabel: string;
  title: string;
  tags: string[];
  summary: {
    short?: string | null;
    long?: string | null;
    analysis: string[];
  };
  representativeArticle: ClusterArticleResponse;
  articles: ClusterArticleResponse[];
  lastUpdatedAt: string;
  articleCount: number | null;
};

export type BatchJobListItemResponse = {
  jobId: number;
  /** `BatchJobType`: `'NEWS_COLLECTION' | 'MARKET_SNAPSHOT'` (docs/api_spec.json). Kept as a plain string, not a union, so an unrecognized value is preserved and shown rather than dropped — see `src/lib/batch-type.ts`. */
  jobType: string;
  jobName: string;
  businessDate: string;
  status: string;
  /** Current/last pipeline step name, or `null`. New in `docs/api_spec.json` — the old contract had no per-stage signal at all (see `src/components/ui/pipeline-stages.tsx`). */
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

/**
 * `docs/api_spec.json`'s `BatchJobSnapshotDetail` — only non-null on a
 * `MARKET_SNAPSHOT` job's detail response. `ai*Count` ×6 exist on the real
 * schema but are out of scope (unused by this app) and deliberately
 * omitted here, same as `runMode`/`sourceJobId`/`sourcePageId`/`queuedAt`/
 * `attemptCount`/`maxAttempts` on `BatchJobDetailResponse` below.
 */
export type BatchJobSnapshotDetail = {
  forceRun: boolean | null;
  rebuildPageOnly: boolean | null;
  rawNewsCount: number;
  processedNewsCount: number;
  clusterCount: number;
  pageId: number | null;
  pageVersionNo: number | null;
};

/**
 * `docs/api_spec.json`'s `BatchJobNewsCollectionDetail` — only non-null on
 * a `NEWS_COLLECTION` job's detail response. Typed for wire-shape fidelity;
 * no mapper/UI reads it yet (out of scope for the jobType-wiring pass that
 * added it — see `docs/design_v2/v2-decisions.md` §10).
 */
export type BatchJobNewsCollectionDetail = {
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
 * `docs/api_spec.json`'s `BatchJobDetailResponse`. Was flat (mirroring the
 * old `docs/api_spec_doc.md` §4 single-batch model) — the real contract
 * nests the snapshot-producing fields under `snapshot` and the
 * news-collection fields under `newsCollection`, both independently
 * nullable by jobType. `mapBatchDetailToRun` (`src/lib/mappers/batch.ts`)
 * used to read `rawNewsCount`/`processedNewsCount`/`clusterCount`/`pageId`/
 * `pageVersionNo`/`forceRun`/`rebuildPageOnly` straight off this type's top
 * level, which no longer exist there — that was a live data bug against the
 * real API (every one of those rendered a wrong value), not a style choice.
 */
export type BatchJobDetailResponse = {
  jobId: number;
  jobName: string;
  jobType: string;
  businessDate: string;
  status: string;
  currentStep: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  partialMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  logSummary: string | null;
  snapshot: BatchJobSnapshotDetail | null;
  newsCollection: BatchJobNewsCollectionDetail | null;
};

export type BatchJobListResponse = {
  items: BatchJobListItemResponse[];
  pagination: PaginationResponse;
  summary: {
    successCount: number;
    partialCount: number;
    failedCount: number;
    avgDurationSeconds: number;
  };
};

export type BatchRunRequest = {
  businessDate?: string | null;
  force?: boolean;
  rebuildPageOnly?: boolean;
};

export type BatchRunResponse = {
  jobId: number;
  jobName: string;
  businessDate: string;
  status: string;
  startedAt: string;
};
