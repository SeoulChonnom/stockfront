/**
 * 테마 선택 상한과 그 안내 문구. 상한 값 자체는 `lib/app-state.ts`의
 * URL 파서가 원 소스다 — URL의 테마 코드를 자를 때도 같은 값을 써야
 * 하기 때문이다. 여기서는 그 값을 재수출할 뿐이다: 컴포넌트 모듈이
 * 아니라 이 모듈이 계속 사는 이유는 `theme-node-filter.ts`와 같다 —
 * 상한은 트리(`archive-theme-tree.tsx`)가 판정하고 문구는 팝오버
 * 푸터(`archive-theme-select.tsx`)가 그리므로 두 컴포넌트가 같은 값을
 * 봐야 하는데, 둘 중 한쪽에서 export하면 `useComponentExportOnlyModules`에
 * 걸린다. 규칙을 파일 단위로 끄는 것보다 공유 상수를 제 모듈로 내보내는
 * 쪽이 맞다.
 */

export { MAX_ARCHIVE_THEME_SELECTIONS } from '@/lib/app-state';

export const THEME_LIMIT_MESSAGE =
  '테마는 최대 10개까지 선택할 수 있습니다. 선택한 테마를 해제한 뒤 다시 시도해 주세요.';
