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
  /** B-4 (A-5) — same field as `ClusterArticle.similarGroupId`; unused by this surface today but mapped for parity. */
  similarGroupId: string;
  /** B-4 (A-5). */
  isSimilarGroupRepresentative: boolean;
  /** B-4 (A-5) — shown as "원문 중복 N건" only when > 0 (A-5 "표시 규칙"). */
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
  // Not currently in the API; keep nullable for a future backend field.
  isLatest: boolean | null;
};

/** `DailyPageResponse.navigation` (B-5) — the adjacent-business-day lookup this page's response already carries. */
export type MarketSnapshotNavigation = {
  previousBusinessDate: string | null;
  nextBusinessDate: string | null;
};

export type KeyPointDirection = 'UP' | 'DOWN' | 'MIXED' | 'FLAT';

/**
 * B-1 "오늘의 핵심" item. Discriminated on `kind` so `direction` only exists
 * on the `direction` item, mirroring `KeyPointResponse`'s compile-time
 * constraint. `mapDailyPageToSnapshot` only ever produces an all-or-nothing
 * `[]` or a valid 3-item `direction → driver → watch` array — see A-2 보장.
 */
export type KeyPoint =
  | {
      kind: 'direction';
      label: string;
      text: string;
      direction: KeyPointDirection;
    }
  | { kind: 'driver'; label: string; text: string }
  | { kind: 'watch'; label: string; text: string };

/** Page-level generation issue (B-1's `KEY_POINTS_GENERATION_FAILED`, etc.). Server `message` is safe to render as-is (A-1-4). */
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
  /** Raw instant used to recompute relative freshness. */
  // Optional for older page fixtures; the mapper always sets it.
  generatedAtIso?: string | null;
  status: StatusTone;
  /** Null means no generated headline; UI chooses the fallback copy. */
  globalHeadline: string | null;
  /** Page-level PARTIAL message, distinct from each market's metadata message. */
  partialMessage?: string | null;
  /** B-1: "오늘의 핵심". Empty means the section is hidden entirely — never partially rendered. */
  keyPoints: KeyPoint[];
  /** B-1: page-level generation issues (e.g. keyPoints generation failure). Never `undefined`; `[]` when none. */
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
  /**
   * B-4 similar-article-group id (A-5). Every article belongs to exactly
   * one group (singletons included) — never used as a "no group" sentinel.
   * Only meaningful within one cluster-detail response; never parsed.
   */
  similarGroupId: string;
  /** B-4 (A-5) — exactly one article per `similarGroupId` has this `true`. */
  isSimilarGroupRepresentative: boolean;
  /**
   * B-4 (A-5) — raw articles merged into this one, excluding itself.
   * Distinct from "other articles in the similar group"; never substitute
   * one count for the other.
   */
  exactDuplicateCount: number;
};

/** B-4 `articleGrouping.status` (docs/backend-requests-2026-08-12.md#A-5). */
type ArticleGroupingStatus = 'READY' | 'UNAVAILABLE';

/** B-4 `articleGrouping.issue` — server-fixed `message`, safe to render verbatim (A-1-4). */
type ArticleGroupingIssue = {
  code: 'SIMILARITY_GROUPING_FAILED';
  message: string;
};

/**
 * `ClusterDetail.articleGrouping` (B-4, A-5). Failure here is isolated to
 * this cluster and never implies the page or the AI analysis failed.
 */
export type ArticleGrouping = {
  status: ArticleGroupingStatus;
  /** `null` exactly when `status === 'UNAVAILABLE'`. */
  generatedAt: string | null;
  /** Present exactly when `status === 'UNAVAILABLE'`. */
  issue: ArticleGroupingIssue | null;
};

/** B-2 `summary.analysisStatus` (docs/backend-requests-2026-08-12.md#A-3). */
export type AnalysisStatus = 'READY' | 'PARTIAL' | 'UNAVAILABLE';

/** B-2 `conflictStatus` — used at both the aggregate `summary` level and per sentence. */
export type ConflictStatus = 'NOT_CHECKED' | 'NONE' | 'FOUND';

/** B-2 analysis section discriminator. Server-fixed order: background → impact → related → outlook. */
type ClusterSectionKind = 'background' | 'impact' | 'related' | 'outlook';

type AnalysisIssueCode =
  | 'ANALYSIS_GENERATION_FAILED'
  | 'NO_GROUNDED_SENTENCES'
  | 'INVALID_SOURCE_REFERENCE'
  | 'CONFLICT_CHECK_FAILED';

/** Server-fixed `message` (A-3 "이슈 코드") — safe to render verbatim. */
export type AnalysisIssue = { code: AnalysisIssueCode; message: string };

/**
 * B-2 sentence — the minimal unit of `summary → sections[] → paragraphs[] →
 * sentences[]`. Source-article grounding and conflict info attach here, not
 * at the paragraph/section level. `sourceArticleIds` /
 * `conflictingSourceArticleIds` reference `ClusterArticle.id` values from
 * the same response's `articles[]`.
 */
export type ClusterSentence = {
  text: string;
  sourceArticleIds: number[];
  conflictStatus: ConflictStatus;
  conflictingSourceArticleIds: number[];
  conflictNote: string | null;
};

export type ClusterParagraph = { sentences: ClusterSentence[] };

/** `title` is server-fixed (A-3 "FE는 제목을 만들지 않는다") — never inferred from body text. */
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
  /** Aggregate of all sentence-level `conflictStatus` values; priority FOUND > NOT_CHECKED > NONE (A-3). */
  conflictStatus: ConflictStatus;
  articles: ClusterArticle[];
  /** B-4 (A-5) — cluster-scoped grouping result driving `articles[]`'s `similarGroupId`s. */
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
