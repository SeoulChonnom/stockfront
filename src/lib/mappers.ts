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
  return values.find((value): value is string => typeof value === 'string') ?? fallback;
}

function mapIndex(item: IndexCardResponse): MarketIndex {
  return {
    label: item.indexName,
    value: formatNumericText(item.closePrice),
    change: formatSignedNumber(item.changeValue),
    changeRate: formatPercent(item.changePercent),
    direction: Number(item.changeValue) >= 0 ? 'up' : 'down',
    high: formatNumericText(item.highPrice),
    low: formatNumericText(item.lowPrice),
  };
}

export function mapDailyPageToSnapshot(
  response: DailyPageResponse
): MarketSnapshot {
  const markets = asDailyMarketArray(response.markets);

  return {
    pageId: response.pageId,
    businessDate: response.businessDate,
    versionNo: response.versionNo,
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
            articleCount:
              typeof cluster.articleCount === 'number' ? cluster.articleCount : 0,
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
      pageId: item.pageId,
      businessDate: item.businessDate,
      headline:
        item.headlineSummary ??
        item.pageTitle ??
        '헤드라인 요약이 아직 생성되지 않았습니다.',
      status: toUpperStatus(item.status, ['READY', 'PARTIAL', 'FAILED']),
      generatedAt: formatTime(item.generatedAt),
      detail: asOptionalString(item.partialMessage) ?? null,
    })),
    page: response.pagination.page,
    size: response.pagination.size,
    totalCount: response.pagination.totalCount,
    totalPages: Math.max(
      1,
      Math.ceil(response.pagination.totalCount / response.pagination.size)
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
    articleCount: response.articleCount ?? articles.length,
    updatedAt: formatDateTime(response.lastUpdatedAt),
  };
}

function mapBatchListItemToRun(item: BatchJobListItemResponse): BatchRun {
  return {
    id: item.jobId,
    jobName: item.jobName,
    market: item.marketScope,
    businessDate: item.businessDate,
    status: toUpperStatus(item.status, ['SUCCESS', 'PARTIAL', 'FAILED']),
    startedAt: formatTime(item.startedAt),
    finishedAt: formatTime(item.endedAt),
    duration: formatDurationSeconds(item.durationSeconds),
    counts: `${item.rawNewsCount} / ${item.processedNewsCount} / ${item.clusterCount}`,
    detail:
      item.partialMessage ??
      `${item.jobName} 배치가 ${item.status} 상태로 기록되었습니다.`,
    pageVersion: item.pageVersionNo === null ? '-' : `v${item.pageVersionNo}`,
  };
}

function mapBatchSummary(response: BatchJobListResponse): BatchSummaryView {
  const totalRuns =
    response.summary.successCount +
    response.summary.partialCount +
    response.summary.failedCount;
  const successRate =
    totalRuns === 0
      ? '0.0%'
      : `${((response.summary.successCount / totalRuns) * 100).toFixed(1)}%`;

  return {
    successRate,
    avgProcessingTime: formatDurationSeconds(
      response.summary.avgDurationSeconds
    ),
    marketSyncQuality:
      response.summary.failedCount === 0 ? 'Stable' : 'Attention',
    successSupporting: `${response.summary.successCount} success / ${response.summary.failedCount} failed`,
    durationSupporting: `Average across ${totalRuns} runs`,
    qualitySupporting:
      response.summary.failedCount === 0
        ? 'No failed jobs in current result set'
        : `${response.summary.failedCount} failed job(s) detected`,
  };
}

export function mapBatchJobsToView(
  response: BatchJobListResponse
): BatchJobsView {
  return {
    rows: response.items.map(mapBatchListItemToRun),
    page: response.pagination.page,
    size: response.pagination.size,
    totalCount: response.pagination.totalCount,
    totalPages: Math.max(
      1,
      Math.ceil(response.pagination.totalCount / response.pagination.size)
    ),
    summary: mapBatchSummary(response),
  };
}

export function mapBatchDetailToRun(
  response: BatchJobDetailResponse
): BatchRun {
  return {
    id: response.jobId,
    jobName: response.jobName,
    market: 'N/A',
    businessDate: response.businessDate,
    status: toUpperStatus(response.status, ['SUCCESS', 'PARTIAL', 'FAILED']),
    startedAt: formatTime(response.startedAt),
    finishedAt: formatTime(response.endedAt),
    duration: formatDurationSeconds(response.durationSeconds),
    counts: `${response.rawNewsCount} / ${response.processedNewsCount} / ${response.clusterCount}`,
    detail:
      response.logSummary ??
      response.errorMessage ??
      response.partialMessage ??
      `${response.jobName} 배치 상세 메시지가 없습니다.`,
    pageVersion:
      response.pageVersionNo === null ? '-' : `v${response.pageVersionNo}`,
  };
}
