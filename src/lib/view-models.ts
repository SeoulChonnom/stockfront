type StatusTone = 'ready' | 'partial' | 'failed' | 'success';

export type MarketIndex = {
  label: string;
  code: string | null;
  value: string;
  change: string;
  changeRate: string;
  direction: 'up' | 'down' | 'none';
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
  /** Same grouping contract as `ClusterArticle`. */
  similarGroupId: string;
  isSimilarGroupRepresentative: boolean;
  /** Shown only when positive. */
  exactDuplicateCount: number;
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
  isLatest: boolean | null;
};

export type MarketSnapshotNavigation = {
  previousBusinessDate: string | null;
  nextBusinessDate: string | null;
};

export type KeyPointDirection = 'UP' | 'DOWN' | 'MIXED' | 'FLAT';

/** All-or-nothing `direction → driver → watch` key-point set. */
export type KeyPoint =
  | {
      kind: 'direction';
      label: '시장 방향';
      text: string;
      direction: KeyPointDirection;
    }
  | { kind: 'driver'; label: '주요 원인'; text: string }
  | { kind: 'watch'; label: '관전 포인트'; text: string };

/** Page issue whose server message is safe to render. */
export type PageIssue = {
  category: 'AI_SUMMARY';
  code: 'KEY_POINTS_GENERATION_FAILED' | 'AI_SUMMARY_FALLBACK';
  message: string;
};

export type MarketSnapshot = {
  pageId: number;
  businessDate: string;
  versionNo: number;
  generatedAt: string;
  navigation: MarketSnapshotNavigation;
  /** Raw instant for relative freshness; optional for older fixtures. */
  generatedAtIso?: string | null;
  status: StatusTone;
  /** Null means no generated headline; UI chooses the fallback copy. */
  globalHeadline: string | null;
  /** Page-level PARTIAL message, distinct from each market's metadata message. */
  partialMessage?: string | null;
  /** Empty hides the entire section. */
  keyPoints: KeyPoint[];
  /** Always present; empty when there are no page issues. */
  issues: PageIssue[];
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
  /** Response-scoped group id; singleton groups also have one. */
  similarGroupId: string;
  /** Exactly one representative per group. */
  isSimilarGroupRepresentative: boolean;
  /** Merged raw articles, excluding itself; not the similar-group size. */
  exactDuplicateCount: number;
};

type ArticleGroupingStatus = 'READY' | 'UNAVAILABLE';

/** Server-fixed message is safe to render. */
type ArticleGroupingIssue = {
  code: 'SIMILARITY_GROUPING_FAILED';
  message: string;
};

/** Grouping failure is isolated from page and analysis status. */
export type ArticleGrouping = {
  status: ArticleGroupingStatus;
  /** `null` exactly when `status === 'UNAVAILABLE'`. */
  generatedAt: string | null;
  /** Present exactly when `status === 'UNAVAILABLE'`. */
  issue: ArticleGroupingIssue | null;
};

export type AnalysisStatus = 'READY' | 'PARTIAL' | 'UNAVAILABLE';

/** Used at both aggregate and sentence levels. */
export type ConflictStatus = 'NOT_CHECKED' | 'NONE' | 'FOUND';

/** Server order: background → impact → related → outlook. */
type ClusterSectionKind = 'background' | 'impact' | 'related' | 'outlook';

type AnalysisIssueCode =
  | 'ANALYSIS_GENERATION_FAILED'
  | 'NO_GROUNDED_SENTENCES'
  | 'INVALID_SOURCE_REFERENCE'
  | 'CONFLICT_CHECK_FAILED';

/** Server-fixed message is safe to render. */
export type AnalysisIssue = { code: AnalysisIssueCode; message: string };

/** Grounding and conflicts attach to sentences and reference this response's articles. */
export type ClusterSentence = {
  text: string;
  sourceArticleIds: number[];
  conflictStatus: ConflictStatus;
  conflictingSourceArticleIds: number[];
  conflictNote: string | null;
};

export type ClusterParagraph = { sentences: ClusterSentence[] };

/** The server supplies the title; never infer it from body text. */
export type ClusterSection = {
  kind: ClusterSectionKind;
  title: string;
  paragraphs: ClusterParagraph[];
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
  analysisStatus: AnalysisStatus;
  /**
   * Pre-formatted KST display string (A-1-5). `null` exactly when
   * `analysisStatus === 'UNAVAILABLE'`. Distinct from `updatedAt` below —
   * never show the cluster's own last-updated time as the analysis
   * timestamp (A-7).
   */
  analysisGeneratedAt: string | null;
  sections: ClusterSection[];
  analysisIssues: AnalysisIssue[];
  /** Sentence aggregate priority: FOUND > NOT_CHECKED > NONE. */
  conflictStatus: ConflictStatus;
  articles: ClusterArticle[];
  /** Cluster-scoped grouping result for `articles`. */
  articleGrouping: ArticleGrouping;
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
