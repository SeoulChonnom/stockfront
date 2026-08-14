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

const SECTION_TITLES: Readonly<Record<ClusterSectionKindResponse, string>> = {
  background: '발생 배경',
  impact: '시장 영향',
  related: '관련 업종·종목',
  outlook: '향후 관전 포인트',
};

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

const ANALYSIS_ISSUE_MESSAGES: Readonly<
  Record<AnalysisIssueResponse['code'], string>
> = {
  ANALYSIS_GENERATION_FAILED: '분석을 생성하지 못했습니다.',
  NO_GROUNDED_SENTENCES: '근거를 확인할 수 있는 분석 문장이 없습니다.',
  INVALID_SOURCE_REFERENCE: '일부 분석 문장의 근거 기사를 확인하지 못했습니다.',
  CONFLICT_CHECK_FAILED: '일부 분석 문장의 충돌 근거를 확인하지 못했습니다.',
};

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
 * Validate the cross-article B-4 invariants before allowing a READY payload
 * to reach the grouping UI. DTO types protect compile-time callers, but API
 * responses are still untrusted at runtime. A malformed response is rendered
 * as a flat list rather than exposing a partial or misleading group.
 */
function hasValidReadyArticleGrouping(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  const articleIds = new Set<number>();
  const representativeCounts = new Map<string, number>();

  for (const item of value) {
    if (!isRecord(item)) {
      return false;
    }

    const processedArticleId = item.processedArticleId;
    const similarGroupId = item.similarGroupId;
    const isRepresentative = item.isSimilarGroupRepresentative;
    const exactDuplicateCount = item.exactDuplicateCount;

    if (
      typeof processedArticleId !== 'number' ||
      !Number.isSafeInteger(processedArticleId) ||
      articleIds.has(processedArticleId) ||
      typeof similarGroupId !== 'string' ||
      similarGroupId.trim().length === 0 ||
      typeof isRepresentative !== 'boolean' ||
      typeof exactDuplicateCount !== 'number' ||
      !Number.isSafeInteger(exactDuplicateCount) ||
      exactDuplicateCount < 0
    ) {
      return false;
    }

    articleIds.add(processedArticleId);
    representativeCounts.set(
      similarGroupId,
      (representativeCounts.get(similarGroupId) ?? 0) +
        (isRepresentative ? 1 : 0)
    );
  }

  return [...representativeCounts.values()].every(
    (representativeCount) => representativeCount === 1
  );
}

function hasValidReadyArticleGroupingEnvelope(value: unknown): boolean {
  if (!isRecord(value) || value.status !== 'READY') {
    return false;
  }

  return formatKstDateTime(value.generatedAt) !== null && value.issue === null;
}

/**
 * A sentence is the minimum grounded unit (A-3). A malformed sentence is a
 * malformed analysis structure, not an optional item that can be filtered
 * while preserving its siblings. Conflict evidence is different: it is a
 * sentence-level best-effort payload and is normalized to `NOT_CHECKED`.
 */
function mapReferencedArticleIds(
  value: unknown,
  availableArticleIds: ReadonlySet<number>
): number[] {
  const ids = asNumberArray(value).filter((id) => availableArticleIds.has(id));
  return [...new Set(ids)];
}

type AnalysisDiagnostics = {
  conflictCheckFailed: boolean;
  structureInvalid: boolean;
};

function readRawArticleIds(value: unknown): {
  ids: number[];
  isValidArray: boolean;
  hasDuplicates: boolean;
} {
  if (!Array.isArray(value)) {
    return { ids: [], isValidArray: false, hasDuplicates: false };
  }

  const ids = value.filter((id): id is number => Number.isSafeInteger(id));

  return {
    ids,
    isValidArray: ids.length === value.length,
    hasDuplicates: new Set(ids).size !== ids.length,
  };
}

function mapConflictPayload(
  raw: Record<string, unknown>,
  sourceArticleIds: number[],
  availableArticleIds: ReadonlySet<number>,
  diagnostics: AnalysisDiagnostics
): Pick<
  ClusterSentence,
  'conflictStatus' | 'conflictingSourceArticleIds' | 'conflictNote'
> {
  const parsedConflictStatus = asEnumOrNull(
    raw.conflictStatus,
    CONFLICT_STATUSES
  );
  const conflictStatus = parsedConflictStatus ?? 'NOT_CHECKED';
  const rawConflictingIds = readRawArticleIds(raw.conflictingSourceArticleIds);
  const hasUnknownId = rawConflictingIds.ids.some(
    (id) => !availableArticleIds.has(id)
  );
  const hasOverlappingId = rawConflictingIds.ids.some((id) =>
    sourceArticleIds.includes(id)
  );
  const rawConflictNote = raw.conflictNote;
  const hasRequiredNote =
    typeof rawConflictNote === 'string' && rawConflictNote.trim().length > 0;

  const invalidPayload =
    parsedConflictStatus === null ||
    !rawConflictingIds.isValidArray ||
    rawConflictingIds.hasDuplicates ||
    hasUnknownId ||
    hasOverlappingId ||
    (conflictStatus === 'FOUND'
      ? rawConflictingIds.ids.length === 0 || !hasRequiredNote
      : rawConflictingIds.ids.length !== 0 || rawConflictNote !== null);

  if (invalidPayload) {
    diagnostics.conflictCheckFailed = true;
    return {
      conflictStatus: 'NOT_CHECKED',
      conflictingSourceArticleIds: [],
      conflictNote: null,
    };
  }

  if (conflictStatus === 'NOT_CHECKED') {
    diagnostics.conflictCheckFailed = true;
  }

  return {
    conflictStatus,
    conflictingSourceArticleIds: rawConflictingIds.ids,
    conflictNote:
      conflictStatus === 'FOUND' ? (rawConflictNote as string) : null,
  };
}

function mapSentence(
  raw: unknown,
  availableArticleIds: ReadonlySet<number>,
  diagnostics: AnalysisDiagnostics
): ClusterSentence | null {
  if (!isRecord(raw)) {
    diagnostics.structureInvalid = true;
    return null;
  }

  if (typeof raw.text !== 'string' || raw.text.trim().length === 0) {
    diagnostics.structureInvalid = true;
    return null;
  }

  if (
    !Array.isArray(raw.sourceArticleIds) ||
    !raw.sourceArticleIds.every((id) => Number.isSafeInteger(id))
  ) {
    diagnostics.structureInvalid = true;
    return null;
  }

  const text = raw.text;
  const sourceArticleIds = mapReferencedArticleIds(
    raw.sourceArticleIds,
    availableArticleIds
  );
  if (sourceArticleIds.length === 0) {
    return null;
  }

  const conflict = mapConflictPayload(
    raw,
    sourceArticleIds,
    availableArticleIds,
    diagnostics
  );

  return {
    text,
    sourceArticleIds,
    ...conflict,
  };
}

function mapParagraph(
  raw: unknown,
  availableArticleIds: ReadonlySet<number>,
  diagnostics: AnalysisDiagnostics
): ClusterParagraph | null {
  if (!isRecord(raw)) {
    diagnostics.structureInvalid = true;
    return null;
  }

  if (!Array.isArray(raw.sentences)) {
    diagnostics.structureInvalid = true;
    return null;
  }

  const sentencesRaw = raw.sentences;
  const sentences = sentencesRaw
    .map((sentence) => mapSentence(sentence, availableArticleIds, diagnostics))
    .filter((sentence): sentence is ClusterSentence => sentence !== null);

  // A paragraph with no valid sentences carries nothing to render.
  return sentences.length > 0 ? { sentences } : null;
}

/**
 * FE never invents a `title` or infers `kind` from body text (A-3 "FE는
 * 제목을 만들지 않는다"). A fixed-kind/title or nested collection violation
 * makes the complete structured analysis uninterpretable.
 */
function mapSection(
  raw: unknown,
  availableArticleIds: ReadonlySet<number>,
  diagnostics: AnalysisDiagnostics
): ClusterSection | null {
  if (!isRecord(raw)) {
    diagnostics.structureInvalid = true;
    return null;
  }

  const kind = asEnumOrNull(raw.kind, SECTION_KINDS);
  const title = raw.title;
  if (
    kind === null ||
    typeof title !== 'string' ||
    title !== SECTION_TITLES[kind]
  ) {
    diagnostics.structureInvalid = true;
    return null;
  }

  if (!Array.isArray(raw.paragraphs)) {
    diagnostics.structureInvalid = true;
    return null;
  }

  const paragraphsRaw = raw.paragraphs;
  const paragraphs = paragraphsRaw
    .map((paragraph) =>
      mapParagraph(paragraph, availableArticleIds, diagnostics)
    )
    .filter((paragraph): paragraph is ClusterParagraph => paragraph !== null);

  return paragraphs.length > 0 ? { kind, title, paragraphs } : null;
}

function mapAnalysisIssues(value: unknown): {
  issues: AnalysisIssue[];
  isValid: boolean;
} {
  if (!Array.isArray(value)) {
    return { issues: [], isValid: false };
  }

  const issues: AnalysisIssue[] = [];
  let isValid = true;

  for (const raw of value) {
    if (!isRecord(raw)) {
      isValid = false;
      continue;
    }

    const code = asEnumOrNull(raw.code, ANALYSIS_ISSUE_CODES);
    if (code === null || typeof raw.message !== 'string') {
      isValid = false;
      continue;
    }

    if (!issues.some((issue) => issue.code === code)) {
      issues.push({ code, message: raw.message });
    }
  }

  return { issues, isValid };
}

function ensureAnalysisIssue(
  issues: AnalysisIssue[],
  code: AnalysisIssueResponse['code']
): AnalysisIssue[] {
  if (issues.some((issue) => issue.code === code)) {
    return issues;
  }

  return [...issues, { code, message: ANALYSIS_ISSUE_MESSAGES[code] }];
}

type AnalysisView = Pick<
  ClusterDetail,
  | 'analysisStatus'
  | 'analysisGeneratedAt'
  | 'sections'
  | 'analysisIssues'
  | 'conflictStatus'
>;

function aggregateConflictStatus(
  sections: ClusterSection[],
  fallback: ConflictStatusResponse,
  hasValidAggregate: boolean
): ConflictStatusResponse {
  if (!hasValidAggregate) {
    return 'NOT_CHECKED';
  }

  const statuses = sections.flatMap((section) =>
    section.paragraphs.flatMap((paragraph) =>
      paragraph.sentences.map((sentence) => sentence.conflictStatus)
    )
  );

  if (statuses.includes('FOUND')) {
    return 'FOUND';
  }

  if (statuses.includes('NOT_CHECKED')) {
    return 'NOT_CHECKED';
  }

  return statuses.length > 0 ? 'NONE' : fallback;
}

function buildUnavailableAnalysis(
  analysisIssues: AnalysisIssue[]
): AnalysisView {
  return {
    analysisStatus: 'UNAVAILABLE',
    analysisGeneratedAt: null,
    sections: [],
    analysisIssues,
    conflictStatus: 'NOT_CHECKED',
  };
}

function buildGenerationFailureAnalysis(): AnalysisView {
  return buildUnavailableAnalysis([
    {
      code: 'ANALYSIS_GENERATION_FAILED',
      message: ANALYSIS_ISSUE_MESSAGES.ANALYSIS_GENERATION_FAILED,
    },
  ]);
}

/**
 * Normalizes the strict B-2 hierarchy without partially rendering an
 * uninterpretable structure. Empty containers are omitted as normal output;
 * non-array collections, non-object members, invalid sentence text, and
 * unsupported section metadata fail the entire analysis. Conflict evidence
 * remains sentence-local and is handled by `mapConflictPayload`.
 */
function mapAnalysis(
  summaryRaw: unknown,
  availableArticleIds: ReadonlySet<number>
): AnalysisView {
  if (!isRecord(summaryRaw)) {
    return buildGenerationFailureAnalysis();
  }

  const summary = summaryRaw;
  const analysisStatus = asEnumOrNull(
    summary.analysisStatus,
    ANALYSIS_STATUSES
  );
  const parsedIssues = mapAnalysisIssues(summary.analysisIssues);
  const rawConflictStatus = asEnumOrNull(
    summary.conflictStatus,
    CONFLICT_STATUSES
  );
  const sectionsRaw = summary.sections;
  const analysisGeneratedAt = summary.analysisGeneratedAt;
  if (
    analysisStatus === null ||
    !parsedIssues.isValid ||
    rawConflictStatus === null ||
    !Array.isArray(sectionsRaw) ||
    (analysisGeneratedAt !== null && typeof analysisGeneratedAt !== 'string')
  ) {
    return buildGenerationFailureAnalysis();
  }

  const diagnostics: AnalysisDiagnostics = {
    conflictCheckFailed: false,
    structureInvalid: false,
  };
  const sections: ClusterSection[] = [];
  let previousSectionIndex = -1;
  for (const sectionRaw of sectionsRaw) {
    const section = mapSection(sectionRaw, availableArticleIds, diagnostics);
    if (section === null) {
      continue;
    }

    const sectionIndex = SECTION_KINDS.indexOf(section.kind);
    if (
      sectionIndex <= previousSectionIndex ||
      sections.some((item) => item.kind === section.kind)
    ) {
      diagnostics.structureInvalid = true;
    }
    previousSectionIndex = sectionIndex;
    sections.push(section);
  }

  if (diagnostics.structureInvalid) {
    return buildGenerationFailureAnalysis();
  }

  const normalizedIssues = parsedIssues.issues;

  if (
    analysisStatus === 'UNAVAILABLE' &&
    (sections.length > 0 ||
      analysisGeneratedAt !== null ||
      rawConflictStatus !== 'NOT_CHECKED')
  ) {
    return buildGenerationFailureAnalysis();
  }

  if (analysisStatus === 'UNAVAILABLE') {
    return buildUnavailableAnalysis(
      normalizedIssues.length > 0
        ? normalizedIssues
        : ensureAnalysisIssue([], 'NO_GROUNDED_SENTENCES')
    );
  }

  let finalIssues = normalizedIssues;

  if (diagnostics.conflictCheckFailed) {
    finalIssues = ensureAnalysisIssue(finalIssues, 'CONFLICT_CHECK_FAILED');
  }

  if (sections.length === 0) {
    finalIssues = ensureAnalysisIssue(finalIssues, 'NO_GROUNDED_SENTENCES');

    return buildUnavailableAnalysis(finalIssues);
  }

  const normalizedStatus =
    analysisStatus === 'READY' && finalIssues.length > 0
      ? 'PARTIAL'
      : analysisStatus;

  return {
    analysisStatus: normalizedStatus,
    analysisGeneratedAt: formatKstDateTime(analysisGeneratedAt),
    sections,
    analysisIssues: finalIssues,
    conflictStatus: aggregateConflictStatus(sections, rawConflictStatus, true),
  };
}

export function mapClusterDetailToView(
  response: ClusterDetailResponse
): ClusterDetail {
  const articleResponses = asArticleArray(response.articles);
  const articles = articleResponses.map((article, index) =>
    mapClusterArticle(
      article,
      `${asString(response.clusterId, 'unknown-cluster')}-${index}`
    )
  );
  const availableArticleIds = new Set(
    articles.flatMap((article) => {
      const id = Number(article.id);
      return Number.isSafeInteger(id) ? [id] : [];
    })
  );
  const summaryShort = isRecord(response.summary)
    ? response.summary.short
    : undefined;
  const summaryLong = isRecord(response.summary)
    ? response.summary.long
    : undefined;
  const analysis = mapAnalysis(response.summary, availableArticleIds);
  const clusterId = asString(response.clusterId, 'unknown-cluster');
  const articleGrouping = mapArticleGrouping(response.articleGrouping);
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
    articles,
    // READY is only safe when all article-level fields and the one-representative
    // invariant survived the runtime boundary. `mapArticleGrouping(undefined)`
    // provides the same explicit, non-blocking UNAVAILABLE fallback copy used
    // for a malformed grouping object.
    articleGrouping:
      articleGrouping.status === 'READY' &&
      (!hasValidReadyArticleGroupingEnvelope(response.articleGrouping) ||
        !hasValidReadyArticleGrouping(response.articles))
        ? mapArticleGrouping(undefined)
        : articleGrouping,
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
