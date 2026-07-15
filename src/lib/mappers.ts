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
  return {
    pageId: response.pageId,
    businessDate: response.businessDate,
    versionNo: response.versionNo,
    generatedAt: formatDateTime(response.generatedAt),
    status: toStatusTone(response.status),
    globalHeadline:
      response.globalHeadline ??
      response.pageTitle ??
      '글로벌 시장 헤드라인이 없습니다.',
    markets: response.markets.map((market) => ({
      label: market.marketLabel,
      summaryTitle:
        market.summaryTitle ??
        market.analysis.keyThemes[0] ??
        `${market.marketLabel} 요약`,
      summaryBody:
        (market.summaryBody ?? market.analysis.background.join(' ')) ||
        '시장 요약 데이터가 아직 생성되지 않았습니다.',
      indices: market.indices.map(mapIndex),
      clusters: market.topClusters.map((cluster) => ({
        id: cluster.clusterId,
        articleCount: cluster.articleCount,
        title: cluster.title,
        summary:
          cluster.summary ??
          cluster.representativeArticle.title ??
          '클러스터 요약이 아직 생성되지 않았습니다.',
        tags: cluster.tags,
      })),
    })),
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
      status: item.status.toUpperCase() as 'READY' | 'PARTIAL' | 'FAILED',
      generatedAt: formatTime(item.generatedAt),
      detail: item.partialMessage,
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
  article: ClusterArticleResponse,
  fallbackId: string
): ClusterArticle {
  return {
    id: String(article.processedArticleId ?? fallbackId),
    source: article.publisherName ?? 'Unknown Source',
    publishedAt: formatDateTime(article.publishedAt),
    title: article.title,
    originalUrl: article.originLink,
    mirrorUrl: article.naverLink ?? article.originLink,
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
  const representative = mapClusterArticle(
    response.representativeArticle,
    `representative-${response.clusterId}`
  );

  return {
    id: response.clusterId,
    businessDate: response.businessDate,
    marketLabel: response.marketLabel,
    title: response.title,
    tags: asStringArray(response.tags),
    analysis,
    articles: articles.map((article, index) =>
      mapClusterArticle(article, `${response.clusterId}-${index}`)
    ),
    representative: {
      ...representative,
      sourceSummary:
        response.representativeArticle.sourceSummary ??
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
    status: item.status.toUpperCase() as 'SUCCESS' | 'PARTIAL' | 'FAILED',
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
    status: response.status.toUpperCase() as 'SUCCESS' | 'PARTIAL' | 'FAILED',
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
