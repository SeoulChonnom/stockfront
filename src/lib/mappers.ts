import type {
  ArchiveListResponse,
  BatchJobDetailResponse,
  BatchJobListItemResponse,
  BatchJobListResponse,
  ClusterArticleResponse,
  ClusterDetailResponse,
  DailyPageResponse,
  IndexCardResponse,
} from './api/types';
import {
  formatDateTime,
  formatDurationSeconds,
  formatNumericText,
  formatPercent,
  formatSignedNumber,
  formatTime,
  toStatusTone,
} from './formatters';
import type {
  ArchiveListView,
  BatchJobsView,
  BatchRun,
  BatchSummaryView,
  ClusterArticle,
  ClusterDetail,
  MarketIndex,
  MarketSnapshot,
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

function toUpperStatus<T extends 'READY' | 'PARTIAL' | 'FAILED' | 'SUCCESS'>(
  value: unknown,
  allowed: readonly T[]
): T | 'FAILED' {
  if (typeof value !== 'string') {
    return 'FAILED';
  }

  const normalized = value.toUpperCase();

  return allowed.includes(normalized as T) ? (normalized as T) : 'FAILED';
}

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
    value: formatNumericText(item.closePrice),
    change: formatSignedNumber(item.changeValue),
    changeRate: formatPercent(item.changePercent),
    direction: changeValue !== null && changeValue >= 0 ? 'up' : 'down',
    high: formatNumericText(item.highPrice),
    low: formatNumericText(item.lowPrice),
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
    generatedAt: formatDateTime(response.generatedAt),
    status: toStatusTone(response.status),
    globalHeadline: firstString(
      [response.globalHeadline, response.pageTitle],
      '글로벌 시장 헤드라인이 없습니다.'
    ),
    markets: markets.map((market) => {
      const label = asString(market.marketLabel, '시장');
      const analysis: Record<string, unknown> = isRecord(market.analysis)
        ? market.analysis
        : {};
      const keyThemes = asStringArray(analysis.keyThemes);
      const background = asStringArray(analysis.background);
      const indices = asIndexArray(market.indices);
      const clusters = asDailyClusterArray(market.topClusters);

      return {
        label,
        summaryTitle: firstString(
          [market.summaryTitle, keyThemes[0]],
          `${label} 요약`
        ),
        summaryBody:
          firstString([market.summaryBody, background.join(' ')], '') ||
          '시장 요약 데이터가 아직 생성되지 않았습니다.',
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
          };
        }),
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
      headline:
        asOptionalString(item.headlineSummary) ??
        asOptionalString(item.pageTitle) ??
        '헤드라인 요약이 아직 생성되지 않았습니다.',
      status: toUpperStatus(item.status, ['READY', 'PARTIAL', 'FAILED']),
      generatedAt: formatTime(item.generatedAt),
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
    source: asString(article.publisherName, 'Unknown Source'),
    publishedAt: formatDateTime(article.publishedAt),
    title: asString(article.title, '기사 제목이 없습니다.'),
    originalUrl: asString(article.originLink, ''),
    mirrorUrl: asString(article.naverLink, asString(article.originLink, '')),
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
    updatedAt: formatDateTime(response.lastUpdatedAt),
  };
}

function mapBatchListItemToRun(item: BatchJobListItemResponse): BatchRun {
  const jobName = asString(item.jobName, 'batch');
  const status = toUpperStatus(item.status, ['SUCCESS', 'PARTIAL', 'FAILED']);

  return {
    id: asFiniteNumber(item.jobId, 0),
    jobName,
    market: asString(item.marketScope, 'N/A'),
    businessDate: asString(item.businessDate, '-'),
    status,
    startedAt: formatTime(item.startedAt),
    finishedAt: formatTime(item.endedAt),
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
    status: toUpperStatus(response.status, ['SUCCESS', 'PARTIAL', 'FAILED']),
    startedAt: formatTime(response.startedAt),
    finishedAt: formatTime(response.endedAt),
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
  };
}
