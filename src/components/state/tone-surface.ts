/**
 * 알림·배너 표면의 색 세트.
 *
 * 다섯 군데(인라인 알림, 부분 생성 배너, 배치 주의 배너, 아카이브 밴드,
 * 클러스터 오류 화면)가 각자 같은 뜻을 다르게 적고 있었다. 어떤 곳은
 * `bg-[color:var(--surface)]` 위에 색 테두리를, 어떤 곳은 `*-soft` 채움을
 * 썼고, 전부 `border-l-4`로 왼쪽에 굵은 색 막대를 붙였다.
 *
 * 하나의 관용구를 세 가지로 적고 있었던 셈이라 여기서 한 벌로 모은다.
 * `StatusBadge`가 이미 쓰고 있는 어휘와 같다 — 1px 톤 테두리 + 톤 채움 +
 * 톤 글자색. 굵은 좌측 막대는 뺐다: 톤은 테두리와 바탕이 이미 전하고,
 * 막대는 그 위에 얹힌 장식이었다.
 *
 * 접근성상 색만으로 뜻이 갈리지 않는다 — 각 배너는 제목 문구와 `!`/`i`
 * 글리프를 그대로 유지하며, 위험 배너는 `role='alert'`을 함께 쓴다.
 */

export type SurfaceTone = 'danger' | 'warning' | 'info' | 'success';

/** 테두리 + 바탕. 요소 자신이 `border`와 반지름을 선언한다는 전제. */
export const TONE_SURFACE: Readonly<Record<SurfaceTone, string>> = {
  danger: 'border-[color:var(--danger-line)] bg-[color:var(--danger-soft)]',
  warning: 'border-[color:var(--warning-line)] bg-[color:var(--warning-soft)]',
  info: 'border-[color:var(--info-line)] bg-[color:var(--info-soft)]',
  success: 'border-[color:var(--success-line)] bg-[color:var(--success-soft)]',
};

/** 제목·글리프용 글자색. 본문은 톤을 타지 않고 `text-fg-soft`로 둔다. */
export const TONE_ACCENT: Readonly<Record<SurfaceTone, string>> = {
  danger: 'text-[color:var(--danger)]',
  warning: 'text-[color:var(--warning)]',
  info: 'text-[color:var(--info)]',
  success: 'text-[color:var(--success)]',
};
