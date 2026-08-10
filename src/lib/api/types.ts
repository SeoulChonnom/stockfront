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
