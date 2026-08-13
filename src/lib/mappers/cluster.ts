import type {
  AnalysisIssueResponse,
  AnalysisStatusResponse,
  ArticleGroupingStatusResponse,
  ClusterArticleResponse,
  ClusterDetailResponse,
  ClusterSectionKindResponse,
  ConflictStatusResponse,
} from '../api/types';
import { formatKstDateTime } from '../formatters';
import { isRecord } from '../utils';
import type {
  AnalysisIssue,
  ArticleGrouping,
  ClusterArticle,
  ClusterDetail,
  ClusterParagraph,
  ClusterSection,
  ClusterSentence,
} from '../view-models';
import {
  asArticleArray,
  asBoolean,
  asDisplayId,
  asEnumOrNull,
  asNonNegativeSafeInteger,
  asNullableString,
  asNumberArray,
  asOptionalString,
  asString,
  asStringArray,
} from './coerce';

const SECTION_KINDS: readonly ClusterSectionKindResponse[] = [
  'background',
  'impact',
  'related',
  'outlook',
];

const ANALYSIS_STATUSES: readonly AnalysisStatusResponse[] = [
  'READY',
  'PARTIAL',
  'UNAVAILABLE',
];

const CONFLICT_STATUSES: readonly ConflictStatusResponse[] = [
  'NOT_CHECKED',
  'NONE',
  'FOUND',
];

const ANALYSIS_ISSUE_CODES: readonly AnalysisIssueResponse['code'][] = [
  'ANALYSIS_GENERATION_FAILED',
  'NO_GROUNDED_SENTENCES',
  'INVALID_SOURCE_REFERENCE',
  'CONFLICT_CHECK_FAILED',
];

const ARTICLE_GROUPING_STATUSES: readonly ArticleGroupingStatusResponse[] = [
  'READY',
  'UNAVAILABLE',
];

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
    // B-4 (A-5). A malformed/missing similarGroupId falls back to a
    // per-article unique id derived from the same fallbackId used for
    // `id` above — never a shared constant, which would silently merge
    // unrelated articles into one similar group.
    similarGroupId: asString(article.similarGroupId, `singleton-${fallbackId}`),
    isSimilarGroupRepresentative: asBoolean(
      article.isSimilarGroupRepresentative,
      true
    ),
    exactDuplicateCount: asNonNegativeSafeInteger(
      article.exactDuplicateCount,
      0
    ),
  };
}

/**
 * B-4 (A-5). Enforces the server's `UNAVAILABLE` invariant at the mapper
 * boundary — `generatedAt: null` and `issue` present — regardless of what a
 * malformed response sends alongside that status, mirroring `mapAnalysis`'s
 * treatment of B-2's `UNAVAILABLE` invariant above.
 */
function mapArticleGrouping(value: unknown): ArticleGrouping {
  const record = isRecord(value) ? value : {};
  const status =
    asEnumOrNull(record.status, ARTICLE_GROUPING_STATUSES) ?? 'UNAVAILABLE';

  if (status === 'UNAVAILABLE') {
    const issueRaw = isRecord(record.issue) ? record.issue : {};
    const code = asEnumOrNull(issueRaw.code, [
      'SIMILARITY_GROUPING_FAILED' as const,
    ]);

    return {
      status,
      generatedAt: null,
      issue: {
        code: code ?? 'SIMILARITY_GROUPING_FAILED',
        message: asString(
          issueRaw.message,
          '유사 기사 묶음을 생성하지 못했습니다.'
        ),
      },
    };
  }

  return {
    status,
    generatedAt: formatKstDateTime(record.generatedAt),
    issue: null,
  };
}

/**
 * A sentence is the minimum grounded unit (A-3). Drop it wholesale when
 * `text` is missing rather than rendering an empty citation — a sentence
 * with no text carries nothing useful. `conflictingSourceArticleIds` /
 * `conflictNote` are force-normalized to empty/null whenever
 * `conflictStatus` isn't `FOUND`, enforcing the server invariant (A-3
 * "충돌 표시" table) even if a malformed response sends something else.
 */
function mapSentence(raw: unknown): ClusterSentence | null {
  if (!isRecord(raw)) {
    return null;
  }

  const text = asOptionalString(raw.text);
  if (!text) {
    return null;
  }

  const conflictStatus =
    asEnumOrNull(raw.conflictStatus, CONFLICT_STATUSES) ?? 'NOT_CHECKED';
  const isFound = conflictStatus === 'FOUND';

  return {
    text,
    sourceArticleIds: asNumberArray(raw.sourceArticleIds),
    conflictStatus,
    conflictingSourceArticleIds: isFound
      ? asNumberArray(raw.conflictingSourceArticleIds)
      : [],
    conflictNote: isFound ? asNullableString(raw.conflictNote) : null,
  };
}

function mapParagraph(raw: unknown): ClusterParagraph | null {
  if (!isRecord(raw)) {
    return null;
  }

  const sentencesRaw = Array.isArray(raw.sentences) ? raw.sentences : [];
  const sentences = sentencesRaw
    .map(mapSentence)
    .filter((sentence): sentence is ClusterSentence => sentence !== null);

  // A paragraph with no valid sentences carries nothing to render.
  return sentences.length > 0 ? { sentences } : null;
}

/**
 * FE never invents a `title` or infers `kind` from body text (A-3 "FE는
 * 제목을 만들지 않는다") — a section missing either is dropped rather than
 * patched with a guessed label.
 */
function mapSection(raw: unknown): ClusterSection | null {
  if (!isRecord(raw)) {
    return null;
  }

  const kind = asEnumOrNull(raw.kind, SECTION_KINDS);
  const title = asOptionalString(raw.title);
  if (kind === null || !title) {
    return null;
  }

  const paragraphsRaw = Array.isArray(raw.paragraphs) ? raw.paragraphs : [];
  const paragraphs = paragraphsRaw
    .map(mapParagraph)
    .filter((paragraph): paragraph is ClusterParagraph => paragraph !== null);

  return paragraphs.length > 0 ? { kind, title, paragraphs } : null;
}

function mapAnalysisIssue(raw: unknown): AnalysisIssue | null {
  if (!isRecord(raw)) {
    return null;
  }

  const code = asEnumOrNull(raw.code, ANALYSIS_ISSUE_CODES);
  return code === null ? null : { code, message: asString(raw.message, '') };
}

function mapAnalysisIssues(value: unknown): AnalysisIssue[] {
  return Array.isArray(value)
    ? value
        .map(mapAnalysisIssue)
        .filter((issue): issue is AnalysisIssue => issue !== null)
    : [];
}

type AnalysisView = Pick<
  ClusterDetail,
  | 'analysisStatus'
  | 'analysisGeneratedAt'
  | 'sections'
  | 'analysisIssues'
  | 'conflictStatus'
>;

/**
 * Enforces the server's `UNAVAILABLE` invariant at the mapper boundary
 * (A-3 "상태별 처리"): `sections: []`, `analysisGeneratedAt: null`, and
 * aggregate `conflictStatus: 'NOT_CHECKED'`, regardless of what a malformed
 * response sends for those fields alongside an `UNAVAILABLE` status. This
 * keeps the UI's condition simple — it only ever has to branch on
 * `analysisStatus`.
 */
function mapAnalysis(summaryRaw: unknown): AnalysisView {
  const summary = isRecord(summaryRaw) ? summaryRaw : {};
  const analysisStatus =
    asEnumOrNull(summary.analysisStatus, ANALYSIS_STATUSES) ?? 'UNAVAILABLE';
  const analysisIssues = mapAnalysisIssues(summary.analysisIssues);

  if (analysisStatus === 'UNAVAILABLE') {
    return {
      analysisStatus,
      analysisGeneratedAt: null,
      sections: [],
      analysisIssues,
      conflictStatus: 'NOT_CHECKED',
    };
  }

  const sectionsRaw = Array.isArray(summary.sections) ? summary.sections : [];

  return {
    analysisStatus,
    analysisGeneratedAt: formatKstDateTime(summary.analysisGeneratedAt),
    sections: sectionsRaw
      .map(mapSection)
      .filter((section): section is ClusterSection => section !== null),
    analysisIssues,
    conflictStatus:
      asEnumOrNull(summary.conflictStatus, CONFLICT_STATUSES) ?? 'NOT_CHECKED',
  };
}

export function mapClusterDetailToView(
  response: ClusterDetailResponse
): ClusterDetail {
  const articles = asArticleArray(response.articles);
  const summaryShort = isRecord(response.summary)
    ? response.summary.short
    : undefined;
  const summaryLong = isRecord(response.summary)
    ? response.summary.long
    : undefined;
  const analysis = mapAnalysis(response.summary);
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
    ...analysis,
    articles: articles.map((article, index) =>
      mapClusterArticle(article, `${clusterId}-${index}`)
    ),
    articleGrouping: mapArticleGrouping(response.articleGrouping),
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
