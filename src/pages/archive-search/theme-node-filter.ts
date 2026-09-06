import type { ThemeNodeResponse } from '@/lib/api/types';

/**
 * 테마 트리 검색 필터. 컴포넌트 모듈이 아니라 여기 사는 이유는
 * `useComponentExportOnlyModules` 때문이다 — 순수 헬퍼를 컴포넌트 파일에서
 * export하면 그 규칙에 걸리고, 규칙을 파일 단위로 끄는 것보다 테스트 가능한
 * 순수 함수를 제 모듈로 내보내는 쪽이 맞다.
 */

function normalizeForSearch(value: string): string {
  return value.normalize('NFC').trim().toLowerCase();
}

function nodeMatchesQuery(
  node: ThemeNodeResponse,
  normalizedQuery: string
): boolean {
  return (
    normalizeForSearch(node.label).includes(normalizedQuery) ||
    normalizeForSearch(node.description).includes(normalizedQuery)
  );
}

/**
 * 검색어와 일치하는 노드, 그 조상, 그 자손, 그리고 이미 선택된 노드를
 * 보존한다. `ancestorMatched`가 true로 내려가면 그 하위 트리 전체를 그대로
 * 복제해 자손을 전부 노출한다 — 부모가 일치하면 자식은 다시 걸러내지 않는다.
 */
function filterNode(
  node: ThemeNodeResponse,
  normalizedQuery: string,
  selectedCodes: readonly string[],
  ancestorMatched: boolean
): ThemeNodeResponse | null {
  const revealSubtree =
    ancestorMatched || nodeMatchesQuery(node, normalizedQuery);
  const children = node.children
    .map((child) =>
      filterNode(child, normalizedQuery, selectedCodes, revealSubtree)
    )
    .filter((child): child is ThemeNodeResponse => child !== null);

  const isSelected = selectedCodes.includes(node.code);
  if (!(revealSubtree || isSelected) && children.length === 0) {
    return null;
  }

  return { ...node, children };
}

export function filterThemeNodes(
  nodes: readonly ThemeNodeResponse[],
  query: string,
  selectedCodes: readonly string[]
): ThemeNodeResponse[] {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) {
    return [...nodes];
  }

  return nodes
    .map((node) => filterNode(node, normalizedQuery, selectedCodes, false))
    .filter((node): node is ThemeNodeResponse => node !== null);
}
