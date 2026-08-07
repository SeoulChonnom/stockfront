/** Shared API job-type catalog for badges and per-type pipeline stages. */

export type BatchTypeTone = 'info' | 'neutral';

/** A stage keeps both its display label and wire key for currentStep matching. */
export type BatchStage = {
  key: string;
  label: string;
};

export type BatchTypeInfo = {
  label: string;
  tone: BatchTypeTone;
  /** Null for unknown job types; callers must not invent a stage list. */
  stages: readonly BatchStage[] | null;
};

const NEWS_COLLECTION_STAGES = [
  { key: 'create_job', label: '작업 생성' },
  { key: 'collect_news', label: '뉴스 수집' },
  { key: 'collect_market_indices', label: '지수 수집' },
  { key: 'dedupe_articles', label: '중복 제거' },
  { key: 'persist_search_result', label: '검색 결과 저장' },
  { key: 'finalize_job', label: '작업 종료' },
] as const;

const MARKET_SNAPSHOT_STAGES = [
  { key: 'create_job', label: '작업 생성' },
  { key: 'load_search_result', label: '검색 결과 적재' },
  { key: 'build_clusters', label: '클러스터 구성' },
  { key: 'generate_ai_summaries', label: 'AI 요약 생성' },
  { key: 'build_page_snapshot', label: '페이지 스냅샷' },
  { key: 'finalize_job', label: '작업 종료' },
] as const;

const BATCH_TYPE_CATALOG: Readonly<Record<string, BatchTypeInfo>> = {
  NEWS_COLLECTION: {
    label: '검색 결과 저장',
    tone: 'neutral',
    stages: NEWS_COLLECTION_STAGES,
  },
  MARKET_SNAPSHOT: {
    label: '스냅샷 생성',
    tone: 'info',
    stages: MARKET_SNAPSHOT_STAGES,
  },
};

/** Unknown types remain visible as raw text with neutral tone and no stages. */
export function getBatchTypeInfo(jobType: string): BatchTypeInfo {
  return (
    BATCH_TYPE_CATALOG[jobType] ?? {
      label: jobType,
      tone: 'neutral',
      stages: null,
    }
  );
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
