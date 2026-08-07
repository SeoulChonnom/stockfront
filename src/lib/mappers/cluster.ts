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
    source: asNullableString(article.publisherName),
    publishedAt: formatKstDateTime(article.publishedAt),
    title: asNullableString(article.title),
    originalUrl: asString(article.originLink, ''),
    // Keep a missing mirror null; do not infer it from originLink.
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
    updatedAt: formatKstDateTime(response.lastUpdatedAt) ?? '-',
  };
}
