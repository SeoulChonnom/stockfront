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

export type MarketTypeResponse = 'US' | 'KR';
type PageStatusResponse = 'READY' | 'PARTIAL' | 'FAILED';
export type ArchiveStatusResponse = 'READY' | 'PARTIAL';

/** Embedded on `DailyPageResponse`; both keys are always present and nullable. */
type PageNavigationResponse = {
  previousBusinessDate: string | null;
  nextBusinessDate: string | null;
};

/** `GET /stock/api/pages/navigation?businessDate=` (B-5). */
export type PageDateNavigationResponse = {
  businessDate: string;
  pageExists: boolean;
  previousBusinessDate: string | null;
  nextBusinessDate: string | null;
};

/** B-1 keyPoint enums. Closed by the backend — do not widen to `string`. */
type KeyPointDirectionResponse = 'UP' | 'DOWN' | 'MIXED' | 'FLAT';

/** B-1 discriminated union; labels and direction are server-fixed. */
export type KeyPointResponse =
  | {
      kind: 'direction';
      label: '시장 방향';
      text: string;
      direction: KeyPointDirectionResponse;
    }
  | { kind: 'driver'; label: '주요 원인'; text: string }
  | { kind: 'watch'; label: '관전 포인트'; text: string };

/** Page issues are persisted diagnostics; the backend schema keeps category/code open. */
type PageIssueResponse = {
  category: string;
  code: string;
  message: string;
};

type PageVersionSummaryResponse = {
  pageId: number;
  versionNo: number;
  status: PageStatusResponse;
  generatedAt: string;
  isLatest: boolean;
};

export type DailyPageResponse = {
  pageId: number;
  businessDate: string;
  versionNo: number;
  pageTitle: string;
  status: PageStatusResponse;
  globalHeadline: string | null;
  generatedAt: string;
  partialMessage: string | null;
  issues: PageIssueResponse[];
  keyPoints: KeyPointResponse[];
  markets: MarketSectionResponse[];
  metadata: {
    rawNewsCount: number;
    processedNewsCount: number;
    clusterCount: number;
    lastUpdatedAt: string;
    isLatest: boolean;
  };
  navigation: PageNavigationResponse;
  versions: PageVersionSummaryResponse[];
};

type MarketAnalysisResponse = {
  background: string[];
  keyThemes: string[];
  outlook: string | null;
};

type MarketMetadataResponse = {
  rawNewsCount: number;
  processedNewsCount: number;
  clusterCount: number;
  lastUpdatedAt: string;
  partialMessage: string | null;
  sourceDate?: string | null;
  expectedSessionDate?: string | null;
  sessionCloseAt?: string | null;
  newsWindowStartAt?: string | null;
  newsWindowEndAt?: string | null;
  coverageComplete?: boolean | null;
};

type MarketSectionResponse = {
  marketType: MarketTypeResponse;
  marketLabel: string;
  summaryTitle: string | null;
  summaryBody: string | null;
  analysis: MarketAnalysisResponse;
  indices: IndexCardResponse[];
  topClusters: ClusterCardResponse[];
  articleLinks: ArticleLinkResponse[];
  metadata: MarketMetadataResponse;
};

export type IndexCardResponse = {
  indexCode: string;
  indexName: string;
  closePrice: string;
  changeValue: string;
  changePercent: string;
  highPrice: string | null;
  lowPrice: string | null;
  sourceDate?: string | null;
  expectedSessionDate?: string | null;
  sessionCloseAt?: string | null;
};

type RepresentativeArticleResponse = {
  title?: string | null;
  publisherName?: string | null;
  publishedAt?: string | null;
  originLink?: string | null;
  naverLink?: string | null;
};

type ClusterCardResponse = {
  clusterId: string;
  title: string;
  summary: string | null;
  articleCount: number;
  tags: string[];
  representativeArticle: RepresentativeArticleResponse;
};

export type ArticleLinkResponse = {
  processedArticleId: number;
  clusterId?: string | null;
  clusterTitle?: string | null;
  title: string;
  publisherName?: string | null;
  publishedAt?: string | null;
  originLink: string;
  naverLink?: string | null;
  similarGroupId: string;
  isSimilarGroupRepresentative: boolean;
  exactDuplicateCount: number;
};

type ArchiveItemResponse = {
  pageId: number;
  businessDate: string;
  pageTitle: string;
  headlineSummary: string | null;
  status: ArchiveStatusResponse;
  generatedAt: string;
  partialMessage: string | null;
};

export type ArchiveListResponse = {
  items: ArchiveItemResponse[];
  pagination: PaginationResponse;
};

/** Recursive active theme catalog returned by `GET /pages/archive/themes`. */
export type ThemeNodeResponse = {
  code: string;
  label: string;
  description: string;
  children: ThemeNodeResponse[];
};

export type ClusterArticleResponse = {
  processedArticleId: number;
  title: string;
  publisherName?: string | null;
  publishedAt?: string | null;
  originLink: string;
  naverLink?: string | null;
  sourceSummary?: string | null;
  similarGroupId: string;
  isSimilarGroupRepresentative: boolean;
  exactDuplicateCount: number;
};

export type ArticleGroupingStatusResponse = 'READY' | 'UNAVAILABLE';

type ArticleGroupingIssueResponse = {
  code: 'SIMILARITY_GROUPING_FAILED';
  message: '유사 기사 묶음을 생성하지 못했습니다.';
};

type ArticleGroupingResponse = {
  status: ArticleGroupingStatusResponse;
  generatedAt: string | null;
  issue: ArticleGroupingIssueResponse | null;
};

export type ClusterSectionKindResponse =
  | 'background'
  | 'impact'
  | 'related'
  | 'outlook';
export type AnalysisStatusResponse = 'READY' | 'PARTIAL' | 'UNAVAILABLE';
export type ConflictStatusResponse = 'NOT_CHECKED' | 'NONE' | 'FOUND';

export type AnalysisIssueResponse = {
  code:
    | 'ANALYSIS_GENERATION_FAILED'
    | 'NO_GROUNDED_SENTENCES'
    | 'INVALID_SOURCE_REFERENCE'
    | 'CONFLICT_CHECK_FAILED';
  message: string;
};

type ClusterSentenceResponse = {
  text: string;
  sourceArticleIds: number[];
  conflictStatus: ConflictStatusResponse;
  conflictingSourceArticleIds: number[];
  conflictNote: string | null;
};

type ClusterParagraphResponse = {
  sentences: ClusterSentenceResponse[];
};

type AnalysisSectionBase = {
  paragraphs: ClusterParagraphResponse[];
};

type ClusterSectionResponse =
  | (AnalysisSectionBase & { kind: 'background'; title: '발생 배경' })
  | (AnalysisSectionBase & { kind: 'impact'; title: '시장 영향' })
  | (AnalysisSectionBase & { kind: 'related'; title: '관련 업종·종목' })
  | (AnalysisSectionBase & { kind: 'outlook'; title: '향후 관전 포인트' });

type ClusterSummaryResponse = {
  short: string | null;
  long: string | null;
  analysisStatus: AnalysisStatusResponse;
  analysisGeneratedAt: string | null;
  analysisIssues: AnalysisIssueResponse[];
  conflictStatus: ConflictStatusResponse;
  sections: ClusterSectionResponse[];
};

export type ClusterDetailResponse = {
  clusterId: string;
  businessDate: string;
  marketType: MarketTypeResponse;
  marketLabel: string;
  title: string;
  tags: string[];
  summary: ClusterSummaryResponse;
  representativeArticle: ClusterArticleResponse;
  articles: ClusterArticleResponse[];
  articleGrouping: ArticleGroupingResponse;
  lastUpdatedAt: string;
  articleCount: number;
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
