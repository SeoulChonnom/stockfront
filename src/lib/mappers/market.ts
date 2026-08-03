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
