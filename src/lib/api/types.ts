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

/** Embedded on `DailyPageResponse` — same lookup as `NavigationResponse` (B-5), scoped to the two fields a loaded page needs. */
type DailyPageNavigationResponse = {
  previousBusinessDate: string | null;
  nextBusinessDate: string | null;
};

/** B-1 keyPoint enums (A-1-7). Closed by the backend — do not widen to `string`. */
type KeyPointDirectionResponse = 'UP' | 'DOWN' | 'MIXED' | 'FLAT';

/**
 * `DailyPageResponse.keyPoints[]` item (B-1, docs/backend-requests-2026-08-12.md#A-2).
 * Discriminated on `kind` so `direction` is only assignable when `kind: 'direction'` —
 * the server rejects any `driver`/`watch` item carrying a `direction` field, so this
 * type encodes the same constraint at compile time.
 */
export type KeyPointResponse =
  | {
      kind: 'direction';
      label: string;
      text: string;
      direction: KeyPointDirectionResponse;
    }
  | { kind: 'driver'; label: string; text: string }
  | { kind: 'watch'; label: string; text: string };

/**
 * `DailyPageResponse.issues[]` item (B-1 adds `KEY_POINTS_GENERATION_FAILED`
 * under category `AI_SUMMARY`; `AI_SUMMARY_FALLBACK` is the pre-existing general
 * AI-summary-failure code the doc names as the thing this must stay distinct
 * from). Only the B-1-scoped category/codes are modeled here — a future
 * category (e.g. B-3's `THEME_CLASSIFICATION`) is out of this task's scope and
 * is dropped by the mapper rather than crashing (A-1-7 "런타임은 관대하게").
 */
type PageIssueResponse = {
  category: 'AI_SUMMARY';
  code: 'KEY_POINTS_GENERATION_FAILED' | 'AI_SUMMARY_FALLBACK';
  message: string;
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
  navigation: DailyPageNavigationResponse;
  /** B-1: page-level "오늘의 핵심". All-or-nothing — exactly 3 (direction→driver→watch) or []. */
  keyPoints: KeyPointResponse[];
  /** B-1: page-level generation issues (e.g. `KEY_POINTS_GENERATION_FAILED`). Never omitted; `[]` when none. */
  issues: PageIssueResponse[];
  markets: MarketSectionResponse[];
  metadata: {
    rawNewsCount: number;
    processedNewsCount: number;
    clusterCount: number;
    lastUpdatedAt: string;
  };
};

/** `GET /stock/api/pages/navigation?businessDate=` (B-5). Contract: docs/backend-requests-2026-08-12.md#A-6. */
export type NavigationResponse = {
  businessDate: string;
  pageExists: boolean;
  previousBusinessDate: string | null;
  nextBusinessDate: string | null;
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
  /** Keep raw jobType so unknown backend values remain visible. */
  jobType: string;
  jobName: string;
  businessDate: string;
  status: string;
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

/** Snapshot fields are non-null only for MARKET_SNAPSHOT details. */
type BatchJobSnapshotDetail = {
  forceRun: boolean | null;
  rebuildPageOnly: boolean | null;
  rawNewsCount: number;
  processedNewsCount: number;
  clusterCount: number;
  pageId: number | null;
  pageVersionNo: number | null;
};

/** NEWS_COLLECTION-only detail fields retained for wire-shape fidelity. */
type BatchJobNewsCollectionDetail = {
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
 * One persisted step execution. Retries and checkpoint resumes repeat the same
 * `stepCode`, so items are only meaningful in the order the backend returns.
 * `status` stays a raw string so future backend statuses remain visible.
 */
export type BatchJobStepRunResponse = {
  stepCode: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  errorLog: string | null;
};

/** Detail response nests nullable snapshot/newsCollection blocks by jobType. */
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
  /** Execution history in persisted order; empty for jobs run before tracking. */
  steps: BatchJobStepRunResponse[];
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

export type AiRetryRunResponse = {
  jobId: number;
  jobName: string;
  businessDate: string;
  status: string;
  runMode: string;
  sourceJobId: number;
  sourcePageId?: number | null;
  idempotencyKey?: string | null;
  startedAt: string;
};
