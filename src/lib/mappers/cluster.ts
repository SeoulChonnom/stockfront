import type {
  ClusterArticleResponse,
  ClusterDetailResponse,
} from '../api/types';
import { formatKstDateTime } from '../formatters';
import { isRecord } from '../utils';
import type { ClusterArticle, ClusterDetail } from '../view-models';
import {
  asArticleArray,
  asDisplayId,
  asNonNegativeSafeInteger,
  asNullableString,
  asOptionalString,
  asString,
  asStringArray,
} from './coerce';

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
