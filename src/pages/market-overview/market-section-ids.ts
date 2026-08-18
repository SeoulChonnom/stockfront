/**
 * 시장 섹션의 id 빌더. 섹션 자체(스크롤 앵커)와 그 제목(`aria-labelledby`
 * 대상 겸 포커스 대상)에 각각 안정적인 id를 준다.
 *
 * 인자는 `markets[]`의 원래 배열 인덱스다 — 화면 표시 위치가 아니다
 * (`market-display-order.ts` 참고).
 *
 * 컴포넌트 모듈이 아니라 별도 모듈에 두는 이유는 Biome의
 * `lint/style/useComponentExportOnlyModules`가 컴포넌트 모듈에 일반 함수
 * export를 섞는 것을 금지하기 때문이다.
 */

export function marketSectionId(index: number): string {
  return `market-section-${index}`;
}

export function marketHeadingId(index: number): string {
  return `market-heading-${index}`;
}
