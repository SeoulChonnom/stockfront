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
  /**
   * `response.summary.short` — parity cycle D11's header lead paragraph
   * (design shows a short summary between the `h1` and the tag row). Not
   * the same slot as `representative.sourceSummary` below, which is a
   * per-article fallback chain that also happens to end at this same DTO
   * field when the representative article has no `sourceSummary` of its
   * own — in that fallback case the header and the aside can legitimately
   * show the same sentence, since the backend has only one field to draw
   * from for both.
   */
  summary: string | null;
  /**
   * `response.summary.long` — parity cycle 2's F1 lead paragraph for the
   * "AI 심층 분석" panel. A genuinely different DTO field from `summary`
   * (`.short`) above, not the same sentence rendered twice: the design's
   * fixtures show `long` opening with the same sentence as `short` and then
   * continuing for 1-2 more.
   */
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
 * Base batch-run shape. Nothing outside this file consumes it directly
 * anymore — `mapBatchListItemToRun`/`mapBatchDetailToRun` (`mappers/batch.ts`)
 * return the enriched `BatchRunRow` below — but it stays as the shared base
 * for `BatchRunRow` so the §7-6/§7-7-only fields (`pageId`/`rawStatus`) are
 * defined in exactly one place.
 */
type BatchRun = {
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

/** Base batch-jobs-list shape; see the `BatchRun` note above — only used here to define `BatchJobsViewWithCounts`. */
type BatchJobsView = {
  rows: BatchRun[];
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
  summary: BatchSummaryView;
};

/**
 * README §7-6/§7-7 배치 운영 화면이 필요로 하지만 `BatchRun`/`BatchJobsView`에는
 * 없는 필드를 더한 확장 뷰모델. `mapBatchListItemToRun`/`mapBatchDetailToRun`이
 * 이 모양을 직접 반환한다.
 *
 * - `pageId`: LIST/DETAIL 매퍼는 합쳐진 `pageVersion`(`v3`/`-`) 문자열만
 *   만들고 숫자 `pageId` 자체는 갖고 있지 않지만, 상세 패널의 "스냅샷
 *   `pageId N · vN`" 표시와 "스냅샷 열기" 액션은 원본 숫자 id가 필요하다.
 * - `rawStatus`: `status`는 `toUpperStatus(value, batchJobStatuses)`를 거친
 *   값인데, 이 함수의 fallback은 허용 목록에 없는 문자열을 전부 `FAILED`로
 *   떨어뜨린다. 정상적으로 실행 중인 배치(RUNNING/PENDING)가 이 fallback을
 *   맞으면 빨간 "생성 실패" 배지로 렌더되는 실사용자 노출 회귀였다 —
 *   그래서 원본 상태 문자열을 그대로 보존해, 화면이 표시/파이프라인 단계
 *   판단에는 `status` 대신 `rawStatus`를 읽도록 한다.
 */
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
