/**
 * `/ops/batches` job-type catalog — README §7-6/§7-7 + `docs/api_spec.json`
 * `BatchJobType` enum (`NEWS_COLLECTION` | `MARKET_SNAPSHOT`).
 *
 * Placed in `src/lib/`, not `src/pages/batch-operations/` (where the
 * original implementation plan put it), because `PipelineStages`
 * (`src/components/ui/pipeline-stages.tsx`) needs the per-type stage list
 * too, and every `components/ui/*` file in this repo only ever imports
 * from `@/lib` or other `components/*` — never from `@/pages/*` (verified:
 * no existing `components/ui/*.tsx` imports `@/pages`). Keeping this
 * catalog under `pages/batch-operations/` would have forced the first such
 * reverse import.
 *
 * `src/pages/batch-operations/filter-copy.ts` already has its own
 * `TYPE_OPTIONS` with the same two labels — that one drives the filter
 * `<select>` (value/label pairs + an "전체 타입" summary fallback for "no
 * filter applied"). This catalog is for per-row/per-detail rendering
 * instead (badge tone + the 6-stage pipeline list), where an unrecognized
 * jobType must show its own raw string, not "전체 타입" — a different
 * fallback contract, so the two aren't merged.
 */

export type BatchTypeTone = 'info' | 'neutral';

/**
 * 파이프라인 단계 하나. `key`와 `label`을 **둘 다** 들고 있는 이유:
 * `label`은 화면에 그리는 문구이고, `key`는 `BatchJobListItemResponse`/
 * `BatchJobDetailResponse`의 `currentStep`을 매칭하기 위한 후보다.
 *
 * `docs/api_spec.json`은 `currentStep`을 enum/example 없이 그냥 `string`으로
 * 두고 있어 실제 wire 형식을 확정할 수 없다. 다만 디자인 핸드오프의
 * `BATCH_STAGES`(`docs/design_v2/handoff_v2/fixtures.js:418-434`)가 단계마다
 * snake_case `key`와 한글 `label`을 함께 정의하고, 같은 파일의 로그 픽스처
 * (605-606행)가 `step=load_search_result` 형태를 쓴다 — 백엔드 식별자는
 * 한글 라벨이 아니라 이 `key`일 가능성이 높다. 그래서 매칭은 두 후보를 모두
 * 인정한다. 둘 다 문서화된 출처에서 온 값이므로 "없는 신호를 지어내지
 * 않는다"(§14)는 그대로 지켜진다 — 어느 쪽과도 안 맞으면 여전히 "확인 불가"다.
 */
export type BatchStage = {
  key: string;
  label: string;
};

export type BatchTypeInfo = {
  label: string;
  tone: BatchTypeTone;
  /**
   * 6 stages in pipeline order, or `null` when `jobType` isn't a
   * recognized `BatchJobType` value — callers must not render a pipeline
   * block at all in that case (never guess a stage list for an unknown
   * type).
   */
  stages: readonly BatchStage[] | null;
};

// Source: `docs/design_v2/handoff_v2/fixtures.js:418-434` (`BATCH_STAGES`) —
// key/label 쌍을 그대로 옮긴다.
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

// Labels: `filter-copy.ts`'s `TYPE_OPTIONS`. Tone: reference HTML 2109행
// (`typeTone: r.jobType === 'SNAPSHOT_BUILD' ? 'info' : 'neutral'`).
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

/**
 * Looks up display info for a raw `jobType` string. An unrecognized value
 * (including `''`) shows its own raw text (never silently blanked) with a
 * neutral tone and no stage list — mirrors `StatusBadge`'s "unknown status
 * still gets shown" fallback philosophy.
 */
export function getBatchTypeInfo(jobType: string): BatchTypeInfo {
  return (
    BATCH_TYPE_CATALOG[jobType] ?? {
      label: jobType,
      tone: 'neutral',
      stages: null,
    }
  );
}

/** True only when snapshot-specific fields are part of the API contract. */
export function isMarketSnapshotJobType(jobType: string): boolean {
  return jobType === 'MARKET_SNAPSHOT';
}

// Small local class map, same pattern as `batch-summary-tiles.tsx`'s
// `TILE_BAR_CLASSES` — the type badge has no status dot (unlike
// `StatusBadge`), so it isn't built from that component's tone table.
export const BATCH_TYPE_TONE_CLASSES: Readonly<Record<BatchTypeTone, string>> =
  {
    info: 'text-[color:var(--info)] bg-[color:var(--info-soft)] border-[color:var(--info-line)]',
    neutral:
      'text-[color:var(--neutral)] bg-[color:var(--neutral-soft)] border-[color:var(--neutral-line)]',
  };
