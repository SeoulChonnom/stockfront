/**
 * 알림·배너·배지 표면의 색 세트.
 *
 * 원래는 배너용(`InlineAlert` 등 6곳)이었고 별도로 `StatusBadge`의
 * `TONE_CLASSES`, `lib/batch-type.ts`의 `BATCH_TYPE_TONE_CLASSES`가 같은
 * `text-X bg-X-soft border-X-line` 조합을 각자 다시 적고 있었다. 세 벌을
 * 하나로 합친다 — 배너와 배지가 같은 어휘(1px 톤 테두리 + 톤 채움 + 톤
 * 글자색)를 쓰고 있었을 뿐이다. 굵은 좌측 막대는 배너 쪽 과거 변형에
 * 있었으나 뺐다: 톤은 테두리와 바탕이 이미 전하고, 막대는 장식이었다.
 *
 * `neutral`은 배지 전용(대기/건너뜀 상태, 알 수 없는 배치 타입)이라
 * 배너 쪽 소비자는 여전히 4톤만 쓴다 — `InlineAlert`의 `AlertTone`이
 * `SurfaceTone`을 그대로 노출하지 않고 4-멤버로 좁혀 계약을 지킨다.
 *
 * 접근성상 색만으로 뜻이 갈리지 않는다 — 각 배너는 제목 문구와 `!`/`i`
 * 글리프를 그대로 유지하며, 위험 배너는 `role='alert'`을 함께 쓴다.
 */

export type SurfaceTone = 'danger' | 'warning' | 'info' | 'success' | 'neutral';

/** 테두리 + 바탕. 요소 자신이 `border`와 반지름을 선언한다는 전제. */
export const TONE_SURFACE: Readonly<Record<SurfaceTone, string>> = {
  danger: 'border-danger-line bg-danger-soft',
  warning: 'border-warning-line bg-warning-soft',
  info: 'border-info-line bg-info-soft',
  success: 'border-success-line bg-success-soft',
  neutral: 'border-neutral-line bg-neutral-soft',
};

/** 제목·글리프용 글자색. 본문은 톤을 타지 않고 `text-fg-soft`로 둔다. */
export const TONE_ACCENT: Readonly<Record<SurfaceTone, string>> = {
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
  success: 'text-success',
  neutral: 'text-neutral',
};
