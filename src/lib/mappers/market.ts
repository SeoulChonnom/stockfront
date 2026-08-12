import type { DailyPageResponse, IndexCardResponse } from '../api/types';
import {
  formatKstDateTime,
  formatNumericText,
  formatPercent,
  formatSignedNumber,
  toStatusTone,
} from '../formatters';
import { isRecord } from '../utils';
import type {
  ArticleLink,
  ClusterRepresentativeArticle,
  MarketAnalysis,
  MarketIndex,
  MarketMetadata,
  MarketSnapshot,
  PageMetadata,
} from '../view-models';
import {
  asArticleLinkArray,
  asDailyClusterArray,
  asDailyMarketArray,
  asDisplayId,
  asFiniteNumber,
  asIndexArray,
  asNonNegativeSafeInteger,
  asNullableString,
  asOptionalBoolean,
  asString,
  asStringArray,
  firstString,
} from './coerce';

function mapIndex(item: IndexCardResponse): MarketIndex {
  const changeValue =
    typeof item.changeValue === 'number'
      ? item.changeValue
      : typeof item.changeValue === 'string' && item.changeValue.length > 0
        ? Number(item.changeValue)
        : null;

  // A missing/unparseable changeValue has no direction to report — mapping
  // it to 'down' would tell users (and screen readers) a decline that never
  // happened. 'none' keeps the value visible without a false claim.
  const direction: MarketIndex['direction'] =
    changeValue === null || Number.isNaN(changeValue)
      ? 'none'
      : changeValue >= 0
        ? 'up'
        : 'down';

  return {
    label: asString(item.indexName, '-'),
    code: asNullableString(item.indexCode),
    value: formatNumericText(item.closePrice),
    change: formatSignedNumber(item.changeValue),
    changeRate: formatPercent(item.changePercent),
    direction,
    high: formatNumericText(item.highPrice),
    low: formatNumericText(item.lowPrice),
  };
}

/** Keeps absent representative fields null so the market row chooses its own copy. */
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
    sourceDate: asNullableString(record.sourceDate),
    expectedSessionDate: asNullableString(record.expectedSessionDate),
  };
}

function mapPageMetadata(value: unknown): PageMetadata {
  const record: Record<string, unknown> = isRecord(value) ? value : {};

  return {
    rawNewsCount: asNonNegativeSafeInteger(record.rawNewsCount, 0),
    processedNewsCount: asNonNegativeSafeInteger(record.processedNewsCount, 0),
    clusterCount: asNonNegativeSafeInteger(record.clusterCount, 0),
    lastUpdatedAt: formatKstDateTime(record.lastUpdatedAt),
    // isLatest is not in the current API; keep it nullable until the backend supplies it.
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
    generatedAt: formatKstDateTime(response.generatedAt) ?? '-',
    generatedAtIso: asNullableString(response.generatedAt),
    status: toStatusTone(response.status),
    /**
     * null을 보존한다. 예전에는 `pageTitle`로 치환해서, AI 요약 단계가
     * 실패해 헤드라인이 생성되지 않은 브리프가 페이지 제목을 헤드라인처럼
     * 보여주며 정상처럼 렌더됐다. "글로벌 헤드라인이 생성되지 않았습니다"
     * 상태는 그래서 실제 데이터로는 도달할 수 없었다.
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
        marketType: asNullableString(market.marketType),
        // Preserve null summaries so missing AI output is not shown as analysis prose.
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
