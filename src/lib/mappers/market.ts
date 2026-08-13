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
  KeyPoint,
  MarketAnalysis,
  MarketIndex,
  MarketMetadata,
  MarketSnapshot,
  MarketSnapshotNavigation,
  PageIssue,
  PageMetadata,
} from '../view-models';
import {
  asArticleLinkArray,
  asDailyClusterArray,
  asDailyMarketArray,
  asDisplayId,
  asEnumOrNull,
  asFiniteNumber,
  asIndexArray,
  asNonNegativeSafeInteger,
  asNullableString,
  asOptionalBoolean,
  asString,
  asStringArray,
  firstString,
} from './coerce';

const KEY_POINT_KINDS = ['direction', 'driver', 'watch'] as const;
const KEY_POINT_DIRECTIONS = ['UP', 'DOWN', 'MIXED', 'FLAT'] as const;
const PAGE_ISSUE_CATEGORIES = ['AI_SUMMARY'] as const;
const PAGE_ISSUE_CODES = [
  'KEY_POINTS_GENERATION_FAILED',
  'AI_SUMMARY_FALLBACK',
] as const;

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

/** B-5: reads the adjacent-business-day pair the daily page response already embeds. Never issues its own request — see `useAdjacentNavigation` for the no-page-loaded path. */
function mapNavigation(value: unknown): MarketSnapshotNavigation {
  const record: Record<string, unknown> = isRecord(value) ? value : {};

  return {
    previousBusinessDate: asNullableString(record.previousBusinessDate),
    nextBusinessDate: asNullableString(record.nextBusinessDate),
  };
}

/** One `keyPoints[]` item, or `null` if `kind`/`direction` doesn't match the closed enum (A-1-7 leniency). */
function mapKeyPoint(value: unknown): KeyPoint | null {
  const record: Record<string, unknown> = isRecord(value) ? value : {};
  const kind = asEnumOrNull(record.kind, KEY_POINT_KINDS);

  if (!kind) {
    return null;
  }

  const label = asString(record.label, '');
  const text = asString(record.text, '');

  if (kind === 'direction') {
    const direction = asEnumOrNull(record.direction, KEY_POINT_DIRECTIONS);
    return direction ? { kind, label, text, direction } : null;
  }

  return { kind, label, text };
}

/**
 * B-1 서버 보장: 성공하면 정확히 3개(direction → driver → watch 순서),
 * 실패하면 `[]`다. 부분 성공(1~2개)은 계약상 존재하지 않으므로, 이 조건을
 * 만족하지 않는 어떤 입력이든 `[]`로 접어 UI가 `length === 3` 하나만
 * 확인하면 되게 한다.
 */
function mapKeyPoints(value: unknown): KeyPoint[] {
  const items = Array.isArray(value) ? value : [];
  const mapped = items.map(mapKeyPoint);

  const isValidTriplet =
    mapped.length === 3 &&
    mapped[0]?.kind === 'direction' &&
    mapped[1]?.kind === 'driver' &&
    mapped[2]?.kind === 'watch';

  return isValidTriplet ? (mapped as KeyPoint[]) : [];
}

/** One `issues[]` item, or `null` if `category`/`code` fall outside the B-1-scoped closed set (A-1-7 leniency). */
function mapPageIssue(value: unknown): PageIssue | null {
  const record: Record<string, unknown> = isRecord(value) ? value : {};
  const category = asEnumOrNull(record.category, PAGE_ISSUE_CATEGORIES);
  const code = asEnumOrNull(record.code, PAGE_ISSUE_CODES);

  if (!category || !code) {
    return null;
  }

  return { category, code, message: asString(record.message, '') };
}

function mapPageIssues(value: unknown): PageIssue[] {
  const items = Array.isArray(value) ? value : [];
  return items
    .map(mapPageIssue)
    .filter((issue): issue is PageIssue => issue !== null);
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
    keyPoints: mapKeyPoints(response.keyPoints),
    issues: mapPageIssues(response.issues),
    navigation: mapNavigation(response.navigation),
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
