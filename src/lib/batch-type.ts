/** Shared API job-type catalog for badges, plus step-code display labels. */

export type BatchTypeTone = 'info' | 'neutral';

export type BatchTypeInfo = {
  label: string;
  tone: BatchTypeTone;
};

const BATCH_TYPE_CATALOG: Readonly<Record<string, BatchTypeInfo>> = {
  NEWS_COLLECTION: {
    label: '검색 결과 저장',
    tone: 'neutral',
  },
  MARKET_SNAPSHOT: {
    label: '스냅샷 생성',
    tone: 'info',
  },
};

/** Unknown types remain visible as raw text with a neutral tone. */
export function getBatchTypeInfo(jobType: string): BatchTypeInfo {
  return (
    BATCH_TYPE_CATALOG[jobType] ?? {
      label: jobType,
      tone: 'neutral',
    }
  );
}

/** Step codes actually emitted by the backend; unknown codes stay visible raw. */
const BATCH_STEP_LABELS: Readonly<Record<string, string>> = {
  CREATE_JOB: '작업 생성',
  PREPARE_MARKET_CONTEXTS: '시장 컨텍스트 준비',
  COLLECT_NEWS: '뉴스 수집',
  COLLECT_NAVER_NEWS: '네이버 뉴스 수집',
  DEDUPE_ARTICLES: '중복 제거',
  BUILD_CLUSTERS: '클러스터 구성',
  COLLECT_MARKET_INDICES: '지수 수집',
  GENERATE_AI_SUMMARIES: 'AI 요약 생성',
  BUILD_PAGE_SNAPSHOT: '페이지 스냅샷',
  FINALIZE_JOB: '작업 종료',
  AI_RETRY_SELECT: '재처리 대상 선택',
  AI_RETRY_GENERATE: 'AI 요약 재처리',
  AI_RETRY_BUILD_PAGE: '재처리 페이지 생성',
  AI_RETRY_FINALIZE: 'AI 재처리 종료',
};

export function getBatchStepLabel(stepCode: string): string {
  return BATCH_STEP_LABELS[stepCode.trim().toUpperCase()] ?? stepCode;
}

export function isMarketSnapshotJobType(jobType: string): boolean {
  return jobType === 'MARKET_SNAPSHOT';
}

export const BATCH_TYPE_TONE_CLASSES: Readonly<Record<BatchTypeTone, string>> =
  {
    info: 'text-[color:var(--info)] bg-[color:var(--info-soft)] border-[color:var(--info-line)]',
    neutral:
      'text-[color:var(--neutral)] bg-[color:var(--neutral-soft)] border-[color:var(--neutral-line)]',
  };
