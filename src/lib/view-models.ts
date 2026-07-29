type StatusTone = 'ready' | 'partial' | 'failed' | 'success';

export type MarketIndex = {
  label: string;
  /** null = DTO에 indexCode 없음. */
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
  // Optional (not just always-populated-by-the-mapper) because existing
  // page-owned test fixtures (e.g. market-overview-page.test.tsx) construct
  // ClusterCard literals without it. mapDailyPageToSnapshot always sets it.
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
};

export type PageMetadata = {
  rawNewsCount: number;
  processedNewsCount: number;
  clusterCount: number;
  lastUpdatedAt: string | null;
  // Currently always `null` in production: `isLatest` is not part of the
  // current API contract (docs/api_spec_doc.md:175-180). The type stays
  // nullable so the mapper (`mapPageMetadata`) remains forward-compatible if
  // the backend adds the field later; until then, treat any reliance on this
  // value as an unmet backend dependency (README §14), not a working feature.
  isLatest: boolean | null;
};

export type MarketSnapshot = {
  pageId: number;
  businessDate: string;
  versionNo: number;
  generatedAt: string;
  /**
   * Raw `generatedAt` ISO string, kept alongside the pre-formatted
   * `generatedAt` display value above. `formatRelativeFreshness` needs the
   * raw instant recomputed against a live "now" (e.g. on an interval) to
   * render "· 2시간 12분 전 생성" — that can't be baked in at map time
   * without going stale. `null` when the DTO value is missing/unparseable.
   */
  // Optional for the same reason as `metadata`/`generatedAtIso` below:
  // page-owned test fixtures built before this restoration don't set it.
  generatedAtIso?: string | null;
  status: StatusTone;
  /** null = 생성되지 않음. 대체 문구는 UI가 고른다 (§7-2). */
  globalHeadline: string | null;
  /**
   * Page-level PARTIAL banner message (README §7-2 point 2: "페이지 레벨
   * 메시지"). Distinct from `metadata.partialMessage`-per-market below —
   * this is `DailyPageResponse.partialMessage`, a sibling of `metadata`,
   * not a member of it. Was never read by the pre-existing mapper (not in
   * the README §13 table either, found by cross-referencing §7-2 against
   * `api/types.ts`); restoring it here since the PARTIAL banner cannot be
   * built without it.
   */
  partialMessage?: string | null;
  // Optional because existing page-owned test fixtures (e.g.
  // market-overview-page.test.tsx) construct MarketSnapshot literals from
  // before this field existed. mapDailyPageToSnapshot always sets it.
  metadata?: PageMetadata;
  markets: {
    label: string;
    /** DTO의 marketType(US/KR). null = 미제공. */
    marketType: string | null;
    /** null = 생성되지 않음. "요약이 생성되지 않았습니다" 문구는 UI 책임 (§7-2). */
    summaryTitle: string | null;
    summaryBody: string | null;
    indices: MarketIndex[];
    clusters: ClusterCard[];
    // Optional for the same reason as ClusterCard.representativeArticle and
    // MarketSnapshot.metadata above — always set by the mapper, but existing
    // hand-written test fixtures predate these fields.
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
  /** null = 네이버 미러 없음 (originalUrl로 backfill하지 않는다). */
  mirrorUrl: string | null;
};

export type ClusterDetail = {
  id: string;
  businessDate: string;
  marketLabel: string;
  title: string;
  tags: string[];
  analysis: string[];
  articles: ClusterArticle[];
  representative: ClusterArticle & {
    sourceSummary: string;
  };
  articleCount: number;
  updatedAt: string;
};

export type BatchRun = {
  id: number;
  jobName: string;
  market: string;
  businessDate: string;
  /**
   * `docs/api_spec_doc.md`가 정의한 배치 상태 전체 집합.
   * RUNNING/PENDING을 빼면 실행 중인 작업이 FAILED로 표시된다.
   */
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  startedAt: string;
  finishedAt: string;
  duration: string;
  counts: string;
  detail: string;
  pageVersion: string;
  /**
   * Only populated by `mapBatchDetailToRun` (the batch job DETAIL response
   * carries these fields; the LIST response does not). `mapBatchListItemToRun`
   * sets all five to `null` since the source DTO has no such data for list
   * rows. Optional (rather than required-and-always-null) because existing
   * page-owned test fixtures (batch-operations-page.test.tsx) construct
   * BatchRun literals from before these fields existed.
   */
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

export type BatchJobsView = {
  rows: BatchRun[];
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
  summary: BatchSummaryView;
};
