type StatusTone = 'ready' | 'partial' | 'failed' | 'success';

export type MarketIndex = {
  label: string;
  code: string | null;
  value: string;
  change: string;
  changeRate: string;
  direction: 'up' | 'down';
  high: string;
  low: string;
};

export type MarketAnalysis = {
  background: string[];
  keyThemes: string[];
  outlook: string | null;
};

export type ClusterRepresentativeArticle = {
  title: string | null;
  source: string | null;
  publishedAt: string | null;
  originalUrl: string | null;
  mirrorUrl: string | null;
};

export type ClusterCard = {
  id: string;
  articleCount: number;
  title: string;
  summary: string;
  tags: string[];
  // Optional for older hand-written fixtures; the mapper always supplies it.
  representativeArticle?: ClusterRepresentativeArticle;
};

export type ArticleLink = {
  id: string;
  clusterId: string | null;
  clusterTitle: string | null;
  title: string;
  source: string | null;
  publishedAt: string | null;
  originalUrl: string;
  mirrorUrl: string | null;
};

export type MarketMetadata = {
  rawNewsCount: number;
  processedNewsCount: number;
  clusterCount: number;
  lastUpdatedAt: string | null;
  partialMessage: string | null;
  /** 실제 사용된 데이터 기준일. 누락 경고의 "사용된 데이터 기준일"에 쓰인다. */
  sourceDate: string | null;
  /** 원래 있어야 할 장 마감 기준일. sourceDate와 다르면 대체 데이터를 쓴 것이다. */
  expectedSessionDate: string | null;
};

export type PageMetadata = {
  rawNewsCount: number;
  processedNewsCount: number;
  clusterCount: number;
  lastUpdatedAt: string | null;
  // Not currently in the API; keep nullable for a future backend field.
  isLatest: boolean | null;
};

export type MarketSnapshot = {
  pageId: number;
  businessDate: string;
  versionNo: number;
  generatedAt: string;
  /** Raw instant used to recompute relative freshness. */
  // Optional for older page fixtures; the mapper always sets it.
  generatedAtIso?: string | null;
  status: StatusTone;
  /** Null means no generated headline; UI chooses the fallback copy. */
  globalHeadline: string | null;
  /** Page-level PARTIAL message, distinct from each market's metadata message. */
  partialMessage?: string | null;
  // Optional for older page fixtures; the mapper always supplies it.
  metadata?: PageMetadata;
  markets: {
    label: string;
    marketType: string | null;
    /** Null means no generated summary; UI chooses the fallback copy. */
    summaryTitle: string | null;
    summaryBody: string | null;
    indices: MarketIndex[];
    clusters: ClusterCard[];
    // Optional for older hand-written fixtures; mapper output includes these.
    analysis?: MarketAnalysis;
    articleLinks?: ArticleLink[];
    metadata?: MarketMetadata;
  }[];
};

export type ArchiveRecord = {
  pageId: number;
  businessDate: string;
  headline: string;
  status: 'READY' | 'PARTIAL' | 'FAILED';
  generatedAt: string;
  detail: string | null;
};

export type ClusterArticle = {
  id: string;
  source: string | null;
  publishedAt: string | null;
  title: string | null;
  originalUrl: string;
  /** Null means no Naver mirror; do not backfill from originalUrl. */
  mirrorUrl: string | null;
};

export type ClusterDetail = {
  id: string;
  businessDate: string;
  marketLabel: string;
  title: string;
  /** DTO `summary.short`, distinct from the representative article summary. */
  summary: string | null;
  /** DTO `summary.long` for AI analysis; it is not the short header summary. */
  analysisLead: string | null;
  tags: string[];
  analysis: string[];
  articles: ClusterArticle[];
  representative: ClusterArticle & {
    sourceSummary: string;
  };
  articleCount: number;
  updatedAt: string;
};

/**
 * One rendered row of batch step history. Repeated `stepCode` values are
 * legitimate retries, so rows are never merged or sorted.
 */
export type BatchStepRunView = {
  stepCode: string;
  label: string;
  status: string;
  duration: string;
};

/** Shared base for list/detail batch rows. */
type BatchRun = {
  id: number;
  jobName: string;
  /** Raw job type; labels and stages are resolved by batch-type.ts. */
  jobType: string;
  currentStep?: string | null;
  market: string;
  businessDate: string;
  /** Full backend status set; keep RUNNING/PENDING distinct from FAILED. */
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  startedAt: string;
  finishedAt: string;
  duration: string;
  counts: string;
  detail: string;
  pageVersion: string;
  /** Detail-only execution history in API order; list rows carry an empty array. */
  steps: BatchStepRunView[];
  /** Detail-only fields; list rows use null and older fixtures may omit them. */
  errorCode?: string | null;
  errorMessage?: string | null;
  logSummary?: string | null;
  forceRun?: boolean | null;
  rebuildPageOnly?: boolean | null;
};

export type ArchiveListView = {
  rows: ArchiveRecord[];
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
};

export type BatchSummaryView = {
  successRate: string;
  avgProcessingTime: string;
  marketSyncQuality: string;
  successSupporting: string;
  durationSupporting: string;
  qualitySupporting: string;
};

/** Base list shape used to define the enriched batch view. */
type BatchJobsView = {
  rows: BatchRun[];
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
  summary: BatchSummaryView;
};

/** Enriched row view; rawStatus preserves RUNNING/PENDING instead of fallback-to-FAILED. */
export type BatchRunRow = BatchRun & {
  pageId: number | null;
  rawStatus: string;
};

type BatchSummaryCounts = {
  successCount: number;
  partialCount: number;
  failedCount: number;
  avgDurationSeconds: number | null;
};

export type BatchJobsViewWithCounts = Omit<BatchJobsView, 'rows'> & {
  rows: BatchRunRow[];
  counts: BatchSummaryCounts;
};
