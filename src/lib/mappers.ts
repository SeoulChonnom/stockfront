import type {
  ArchiveListResponse,
  ArticleLinkResponse,
  BatchJobDetailResponse,
  BatchJobListItemResponse,
  BatchJobListResponse,
  ClusterArticleResponse,
  ClusterDetailResponse,
  DailyPageResponse,
  IndexCardResponse,
} from './api/types';
import {
  formatDurationSeconds,
  formatKstDateTime,
  formatNumericText,
  formatPercent,
  formatSignedNumber,
  toStatusTone,
} from './formatters';
import type {
  ArchiveListView,
  ArticleLink,
  BatchJobsView,
  BatchRun,
  BatchSummaryView,
  ClusterArticle,
  ClusterDetail,
  ClusterRepresentativeArticle,
  MarketAnalysis,
  MarketIndex,
  MarketMetadata,
  MarketSnapshot,
  PageMetadata,
} from './view-models';

type DailyMarketResponse = DailyPageResponse['markets'][number];
type DailyClusterResponse = DailyMarketResponse['topClusters'][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function asArticleArray(value: unknown): ClusterArticleResponse[] {
  return Array.isArray(value)
    ? value.filter((item): item is ClusterArticleResponse => isRecord(item))
    : [];
}

function asArticleLinkArray(value: unknown): ArticleLinkResponse[] {
  return Array.isArray(value)
    ? value.filter((item): item is ArticleLinkResponse => isRecord(item))
    : [];
}

function asDailyMarketArray(value: unknown): DailyMarketResponse[] {
  return Array.isArray(value)
    ? value.filter((item): item is DailyMarketResponse => isRecord(item))
    : [];
}

function asIndexArray(value: unknown): IndexCardResponse[] {
  return Array.isArray(value)
    ? value.filter((item): item is IndexCardResponse => isRecord(item))
    : [];
}

function asDailyClusterArray(value: unknown): DailyClusterResponse[] {
  return Array.isArray(value)
    ? value.filter((item): item is DailyClusterResponse => isRecord(item))
    : [];
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asOptionalBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asNonNegativeSafeInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

function asNullableFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asDisplayId(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function toUpperStatus<
  T extends
    | 'READY'
    | 'PARTIAL'
    | 'FAILED'
    | 'SUCCESS'
    | 'RUNNING'
    | 'PENDING'
    | 'SKIPPED',
>(value: unknown, allowed: readonly T[]): T | 'FAILED' {
  if (typeof value !== 'string') {
    return 'FAILED';
  }

  const normalized = value.toUpperCase();

  return allowed.includes(normalized as T) ? (normalized as T) : 'FAILED';
}

/**
 * 배치 작업 상태 허용값.
 *
 * `docs/api_spec_doc.md`(§배치 작업 상태 표)는 batch job status를
 * `PENDING | RUNNING | SUCCESS | PARTIAL | FAILED`로 정의한다. 과거에는
 * `['SUCCESS','PARTIAL','FAILED']`만 허용해서 `toUpperStatus`의 fallback이
 * 실행 중(RUNNING)·대기(PENDING) 작업을 전부 `FAILED`로 떨어뜨렸고,
 * 그 결과 정상 진행 중인 배치가 빨간 '생성 실패' 배지로 표시됐다.
 * 상태를 임의로 축소하지 말 것 — StatusBadge가 6개 상태를 모두 렌더한다.
 */
const batchJobStatuses = [
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'PARTIAL',
  'FAILED',
] as const;

function firstString(values: unknown[], fallback: string): string {
  return (
    values.find((value): value is string => typeof value === 'string') ??
    fallback
  );
}

function mapIndex(item: IndexCardResponse): MarketIndex {
  const changeValue =
    typeof item.changeValue === 'number'
      ? item.changeValue
      : typeof item.changeValue === 'string' && item.changeValue.length > 0
        ? Number(item.changeValue)
        : null;

  return {
    label: asString(item.indexName, '-'),
    /** DTO의 indexCode — §7-2 지수명 아래 mono 코드 서브라인. */
    code: asNullableString(item.indexCode),
    value: formatNumericText(item.closePrice),
    change: formatSignedNumber(item.changeValue),
    changeRate: formatPercent(item.changePercent),
    direction: changeValue !== null && changeValue >= 0 ? 'up' : 'down',
    high: formatNumericText(item.highPrice),
    low: formatNumericText(item.lowPrice),
  };
}

/**
 * Maps a daily-page or cluster-card `representativeArticle` sub-object into
 * a view model. Unlike `mapClusterArticle` (used by the cluster DETAIL
 * response, which already bakes Korean fallback copy into `source`/`title`
 * for existing, test-locked behavior), this keeps every field `null` when
 * absent so the market-section "핵심 이슈" row can choose its own
 * empty-state copy per §7-2 of the v2 handoff.
 */
function mapRepresentativeArticleMeta(
  value: unknown
): ClusterRepresentativeArticle {
  const record: Record<string, unknown> = isRecord(value) ? value : {};

  return {
    title: asNullableString(record.title),
    source: asNullableString(record.publisherName),
    publishedAt: formatKstDateTime(record.publishedAt),
    originalUrl: asNullableString(record.originLink),
    mirrorUrl: asNullableString(record.naverLink),
  };
}

function mapArticleLink(value: unknown, fallbackId: string): ArticleLink {
  const record: Record<string, unknown> = isRecord(value) ? value : {};

  return {
    id: asDisplayId(record.processedArticleId, fallbackId),
    clusterId: asNullableString(record.clusterId),
    clusterTitle: asNullableString(record.clusterTitle),
    title: asString(record.title, '기사 제목이 없습니다.'),
    source: asNullableString(record.publisherName),
    publishedAt: formatKstDateTime(record.publishedAt),
    originalUrl: asString(record.originLink, ''),
    mirrorUrl: asNullableString(record.naverLink),
  };
}

function mapMarketMetadata(value: unknown): MarketMetadata {
  const record: Record<string, unknown> = isRecord(value) ? value : {};

  return {
    rawNewsCount: asNonNegativeSafeInteger(record.rawNewsCount, 0),
    processedNewsCount: asNonNegativeSafeInteger(record.processedNewsCount, 0),
    clusterCount: asNonNegativeSafeInteger(record.clusterCount, 0),
    lastUpdatedAt: formatKstDateTime(record.lastUpdatedAt),
    partialMessage: asNullableString(record.partialMessage),
  };
}

function mapPageMetadata(value: unknown): PageMetadata {
  const record: Record<string, unknown> = isRecord(value) ? value : {};

  return {
    rawNewsCount: asNonNegativeSafeInteger(record.rawNewsCount, 0),
    processedNewsCount: asNonNegativeSafeInteger(record.processedNewsCount, 0),
    clusterCount: asNonNegativeSafeInteger(record.clusterCount, 0),
    lastUpdatedAt: formatKstDateTime(record.lastUpdatedAt),
    // `isLatest`는 현재 API 계약(docs/api_spec_doc.md:175-180)에 없는
    // 필드다. `docs/design_v2/handoff_v2/fixtures.js`는 디자인 프로토타입용
    // 픽스처일 뿐 실제 응답 캡처가 아니며, 이 필드를 임의로 포함하고 있다.
    // 따라서 오늘 기준으로는 항상 `null`로 귀결되며, UI는 이 값에 의존하지
    // 말고 백엔드가 필드를 실제로 내려주기 전까지는 별도 의존성(README §14)
    // 으로 취급해야 한다.
    isLatest: asOptionalBoolean(record.isLatest),
  };
}

function mapMarketAnalysis(value: unknown): MarketAnalysis {
  const record: Record<string, unknown> = isRecord(value) ? value : {};

  return {
    background: asStringArray(record.background),
    keyThemes: asStringArray(record.keyThemes),
    outlook: asNullableString(record.outlook),
  };
}

export function mapDailyPageToSnapshot(
  response: DailyPageResponse
): MarketSnapshot {
  const markets = asDailyMarketArray(response.markets);

  return {
    pageId: asFiniteNumber(response.pageId, 0),
    businessDate: asString(response.businessDate, '-'),
    versionNo: asFiniteNumber(response.versionNo, 0),
    // D2: absolute KST datetime, not the ko-KR locale string `formatDateTime`
    // produced. `decision-header-card.tsx` prefers `generatedAtIso` (always
    // set by the real API) formatted the same way — this field is only the
    // fallback for callers/fixtures that predate `generatedAtIso` — but it
    // must still match the design's format if it's ever the one rendered.
    generatedAt: formatKstDateTime(response.generatedAt) ?? '-',
    generatedAtIso: asNullableString(response.generatedAt),
    status: toStatusTone(response.status),
    /**
     * null을 보존한다. 예전에는 `pageTitle`로 치환해서, AI 요약 단계가
     * 실패해 헤드라인이 생성되지 않은 브리프가 페이지 제목을 헤드라인처럼
     * 보여주며 정상처럼 렌더됐다. README §7-2의 "글로벌 헤드라인이 생성되지
     * 않았습니다" 상태는 그래서 실제 데이터로는 도달할 수 없었다.
     * 표현(대체 문구) 선택은 UI의 책임이다.
     */
    globalHeadline: asNullableString(response.globalHeadline),
    partialMessage: asNullableString(response.partialMessage),
    metadata: mapPageMetadata(response.metadata),
    markets: markets.map((market) => {
      const label = asString(market.marketLabel, '시장');
      const indices = asIndexArray(market.indices);
      const clusters = asDailyClusterArray(market.topClusters);
      const articleLinks = asArticleLinkArray(market.articleLinks);

      return {
        label,
        /** DTO의 marketType(US/KR) — §7-2 시장 코드 배지에 필요. */
        marketType: asNullableString(market.marketType),
        /**
         * summaryTitle / summaryBody 역시 null을 보존한다. summaryBody를
         * `background.join(' ')`로 대체하면 "이 시장의 요약이 생성되지
         * 않았습니다"(§7-2) 상태에 도달할 수 없고, 분석 배경 불릿이 내러티브
         * 본문으로 둔갑해 같은 문장이 두 곳에 중복 표시된다.
         */
        summaryTitle: asNullableString(market.summaryTitle),
        summaryBody: asNullableString(market.summaryBody),
        indices: indices.map(mapIndex),
        clusters: clusters.map((cluster) => {
          const representativeArticle = isRecord(cluster.representativeArticle)
            ? cluster.representativeArticle
            : {};

          return {
            id: asString(cluster.clusterId, 'unknown-cluster'),
            articleCount: asNonNegativeSafeInteger(cluster.articleCount, 0),
            title: asString(cluster.title, '클러스터 제목이 없습니다.'),
            summary: firstString(
              [cluster.summary, representativeArticle.title],
              '클러스터 요약이 아직 생성되지 않았습니다.'
            ),
            tags: asStringArray(cluster.tags),
            representativeArticle: mapRepresentativeArticleMeta(
              cluster.representativeArticle
            ),
          };
        }),
        analysis: mapMarketAnalysis(market.analysis),
        articleLinks: articleLinks.map((link, index) =>
          mapArticleLink(link, `article-link-${index}`)
        ),
        metadata: mapMarketMetadata(market.metadata),
      };
    }),
  };
}

export function mapArchiveListToView(
  response: ArchiveListResponse
): ArchiveListView {
  return {
    rows: response.items.map((item) => ({
      pageId: asFiniteNumber(item.pageId, 0),
      businessDate: asString(item.businessDate, '-'),
      // D4: `headlineSummary` null falls straight to the "not generated"
      // copy — no longer backfilled with `pageTitle`, which made a FAILED
      // (AI-summary-failed) row look like a normal successful one.
      headline:
        asOptionalString(item.headlineSummary) ??
        '헤드라인이 생성되지 않았습니다',
      status: toUpperStatus(item.status, ['READY', 'PARTIAL', 'FAILED']),
      // D3: absolute KST datetime, not the time-only-with-seconds
      // `formatTime` produced ("06:08:10").
      generatedAt: formatKstDateTime(item.generatedAt) ?? '-',
      detail: asOptionalString(item.partialMessage) ?? null,
    })),
    page: asFiniteNumber(response.pagination.page, 1),
    size: asFiniteNumber(response.pagination.size, 1),
    totalCount: asFiniteNumber(response.pagination.totalCount, 0),
    totalPages: Math.max(
      1,
      Math.ceil(
        asFiniteNumber(response.pagination.totalCount, 0) /
          asFiniteNumber(response.pagination.size, 1)
      )
    ),
  };
}

function mapClusterArticle(
  article: ClusterArticleResponse | Record<string, unknown>,
  fallbackId: string
): ClusterArticle {
  return {
    id: asDisplayId(article.processedArticleId, fallbackId),
    /**
     * 한국어 UI에 영어 placeholder('Unknown Source')를 굽지 않는다.
     * null을 그대로 넘기고 "언론사 미확인"/"발행 시각 미확인" 같은 문구는
     * 컴포넌트가 고른다 (§7-5).
     */
    source: asNullableString(article.publisherName),
    publishedAt: formatKstDateTime(article.publishedAt),
    title: asNullableString(article.title),
    originalUrl: asString(article.originLink, ''),
    /**
     * naverLink가 없을 때 originLink로 backfill하지 않는다. backfill하면
     * 원문과 네이버 미러를 구분할 수 없어(§7-5 필수) 화면이
     * `mirrorUrl === originalUrl` 문자열 비교로 되돌려 추측해야 했다.
     */
    mirrorUrl: asNullableString(article.naverLink),
  };
}

export function mapClusterDetailToView(
  response: ClusterDetailResponse
): ClusterDetail {
  const articles = asArticleArray(response.articles);
  const analysis = isRecord(response.summary)
    ? asStringArray(response.summary.analysis)
    : [];
  const summaryShort = isRecord(response.summary)
    ? response.summary.short
    : undefined;
  // F1 (parity cycle 2): `summary.long` is a distinct DTO field from
  // `summary.short` above — not the same sentence rendered twice. Design's
  // header lead (D11, cycle 1) is the SHORT summary; the "AI 심층 분석"
  // panel's own lead paragraph is the LONG one, which continues past where
  // the short one ends. Confirmed by reading the design fixtures: `short`
  // is one sentence, `long` is that same opening sentence plus 1-2 more.
  const summaryLong = isRecord(response.summary)
    ? response.summary.long
    : undefined;
  const clusterId = asString(response.clusterId, 'unknown-cluster');
  const representativeArticle: Record<string, unknown> = isRecord(
    response.representativeArticle
  )
    ? response.representativeArticle
    : {};
  const representative = mapClusterArticle(
    representativeArticle,
    `representative-${clusterId}`
  );

  return {
    id: clusterId,
    businessDate: asString(response.businessDate, '-'),
    marketLabel: asString(response.marketLabel, '시장'),
    title: asString(response.title, '클러스터 제목이 없습니다.'),
    summary: typeof summaryShort === 'string' ? summaryShort : null,
    analysisLead: typeof summaryLong === 'string' ? summaryLong : null,
    tags: asStringArray(response.tags),
    analysis,
    articles: articles.map((article, index) =>
      mapClusterArticle(article, `${clusterId}-${index}`)
    ),
    representative: {
      ...representative,
      sourceSummary:
        asOptionalString(representativeArticle.sourceSummary) ??
        (typeof summaryShort === 'string' ? summaryShort : undefined) ??
        '대표 기사 요약이 아직 생성되지 않았습니다.',
    },
    articleCount: asNonNegativeSafeInteger(
      response.articleCount,
      articles.length
    ),
    // D2/D3: absolute KST datetime ("YYYY-MM-DD HH:mm KST"), not the ko-KR
    // locale string ("2026. 07. 27. 06:12") `formatDateTime` produced.
    updatedAt: formatKstDateTime(response.lastUpdatedAt) ?? '-',
  };
}

function mapBatchListItemToRun(item: BatchJobListItemResponse): BatchRun {
  const jobName = asString(item.jobName, 'batch');
  const status = toUpperStatus(item.status, batchJobStatuses);

  return {
    id: asFiniteNumber(item.jobId, 0),
    jobName,
    market: asString(item.marketScope, 'N/A'),
    businessDate: asString(item.businessDate, '-'),
    status,
    // D10: absolute KST datetime ("2026-07-27 06:10 KST"), not the
    // time-only `formatTime` produced ("06:10:00") — the design's history
    // list subline and the detail panel's 시작/종료 both use this format.
    startedAt: formatKstDateTime(item.startedAt) ?? '-',
    finishedAt: formatKstDateTime(item.endedAt) ?? '-',
    duration: formatDurationSeconds(
      asNullableFiniteNumber(item.durationSeconds)
    ),
    counts: `${asFiniteNumber(item.rawNewsCount, 0)} / ${asFiniteNumber(item.processedNewsCount, 0)} / ${asFiniteNumber(item.clusterCount, 0)}`,
    detail:
      asOptionalString(item.partialMessage) ??
      `${jobName} 배치가 ${status} 상태로 기록되었습니다.`,
    pageVersion:
      asNullableFiniteNumber(item.pageVersionNo) === null
        ? '-'
        : `v${asNullableFiniteNumber(item.pageVersionNo)}`,
    // The batch job LIST DTO (`BatchJobListItemResponse`) has no errorCode /
    // errorMessage / logSummary / forceRun / rebuildPageOnly fields — those
    // only exist on the DETAIL response. Kept `null` here for a uniform
    // `BatchRun` shape; `mapBatchDetailToRun` below populates them.
    errorCode: null,
    errorMessage: null,
    logSummary: null,
    forceRun: null,
    rebuildPageOnly: null,
  };
}

function mapBatchSummary(response: BatchJobListResponse): BatchSummaryView {
  const successCount = asFiniteNumber(response.summary.successCount, 0);
  const partialCount = asFiniteNumber(response.summary.partialCount, 0);
  const failedCount = asFiniteNumber(response.summary.failedCount, 0);
  const totalRuns = successCount + partialCount + failedCount;
  const successRate =
    totalRuns === 0
      ? '0.0%'
      : `${((successCount / totalRuns) * 100).toFixed(1)}%`;

  return {
    successRate,
    avgProcessingTime: formatDurationSeconds(
      asNullableFiniteNumber(response.summary.avgDurationSeconds)
    ),
    marketSyncQuality: failedCount === 0 ? 'Stable' : 'Attention',
    successSupporting: `${successCount} success / ${failedCount} failed`,
    durationSupporting: `Average across ${totalRuns} runs`,
    qualitySupporting:
      failedCount === 0
        ? 'No failed jobs in current result set'
        : `${failedCount} failed job(s) detected`,
  };
}

export function mapBatchJobsToView(
  response: BatchJobListResponse
): BatchJobsView {
  return {
    rows: response.items.map(mapBatchListItemToRun),
    page: asFiniteNumber(response.pagination.page, 1),
    size: asFiniteNumber(response.pagination.size, 1),
    totalCount: asFiniteNumber(response.pagination.totalCount, 0),
    totalPages: Math.max(
      1,
      Math.ceil(
        asFiniteNumber(response.pagination.totalCount, 0) /
          asFiniteNumber(response.pagination.size, 1)
      )
    ),
    summary: mapBatchSummary(response),
  };
}

export function mapBatchDetailToRun(
  response: BatchJobDetailResponse
): BatchRun {
  const jobName = asString(response.jobName, 'batch');

  return {
    id: asFiniteNumber(response.jobId, 0),
    jobName,
    market: 'N/A',
    businessDate: asString(response.businessDate, '-'),
    status: toUpperStatus(response.status, batchJobStatuses),
    // D10: see the matching comment in `mapBatchListItemToRun` above.
    startedAt: formatKstDateTime(response.startedAt) ?? '-',
    finishedAt: formatKstDateTime(response.endedAt) ?? '-',
    duration: formatDurationSeconds(
      asNullableFiniteNumber(response.durationSeconds)
    ),
    counts: `${asFiniteNumber(response.rawNewsCount, 0)} / ${asFiniteNumber(response.processedNewsCount, 0)} / ${asFiniteNumber(response.clusterCount, 0)}`,
    detail:
      asOptionalString(response.logSummary) ??
      asOptionalString(response.errorMessage) ??
      asOptionalString(response.partialMessage) ??
      `${jobName} 배치 상세 메시지가 없습니다.`,
    pageVersion:
      asNullableFiniteNumber(response.pageVersionNo) === null
        ? '-'
        : `v${asNullableFiniteNumber(response.pageVersionNo)}`,
    errorCode: asNullableString(response.errorCode),
    errorMessage: asNullableString(response.errorMessage),
    logSummary: asNullableString(response.logSummary),
    forceRun: asOptionalBoolean(response.forceRun),
    rebuildPageOnly: asOptionalBoolean(response.rebuildPageOnly),
  };
}
