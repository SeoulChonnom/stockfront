/**
 * 착지 표시 — 점프가 어디에 내렸는지 알려 준다.
 *
 * 이 제품의 핵심 동작 하나는 **주장에서 근거로 따라가는 것**이다(PRODUCT.md
 * "흩어져 있지 않고 한 맥락으로 연결되어야 한다"). 구현은 세 갈래인데 —
 * 비교 밴드 → 시장 섹션, 인용 칩 → 근거 기사, 그룹 펼침 → 숨어 있던 기사 —
 * 셋 다 `scrollIntoView` + `focus({ preventScroll: true })`로 끝난다.
 *
 * 그게 조용한 순간 이동이었다. 실측:
 *
 *   인용 칩 클릭 → li#cluster-article-2500
 *     :focus-visible=false · outline-style=none · box-shadow=none
 *   비교 밴드 클릭 → h2#market-heading-1
 *     :focus-visible=false · scrollY 0 → 596
 *
 * 프로그램 포커스는 **마지막 입력이 키보드였을 때만** `:focus-visible`에
 * 걸린다. 마우스로 칩을 누른 사람에게는 링이 뜨지 않는다. 화면이 600px
 * 굴러가서 멈추는데, 그 화면 어디를 보라는 표시가 없다.
 *
 * 그래서 도착한 대상이 앱이 이미 쓰는 "이것" 색(`--primary-soft` 면 +
 * `--primary-line` 1px 링)을 잠깐 뒤집어썼다가 빠진다. 새로운 요소가
 * 나타나는 게 아니라 있던 것이 손을 드는 것이므로, 채움은 배경색이 아니라
 * `box-shadow`의 inset으로 칠한다 — 대상의 원래 배경(그룹 멤버 행의
 * `--surface-2` 같은)을 건드리지 않는다.
 *
 * 표시는 한 번에 하나뿐이다. 두 개가 켜져 있으면 "여기"가 두 곳이 된다.
 */

const ATTRIBUTE = 'data-arrived';

/** `--dur-arrival`과 같은 값. 애니메이션이 끝난 뒤에 속성을 지운다. */
export const ARRIVAL_MARK_MS = 1100;

let markedElement: Element | null = null;
let clearTimer: number | null = null;

function clearMark(): void {
  if (clearTimer !== null) {
    window.clearTimeout(clearTimer);
    clearTimer = null;
  }

  markedElement?.removeAttribute(ATTRIBUTE);
  markedElement = null;
}

/**
 * 표시를 받을 요소를 고른다.
 *
 * 스크롤 대상과 표시 대상이 늘 같지는 않다. 시장 섹션은 카드 전체가
 * 스크롤 대상이지만 전체를 칠하면 화면 한 판이 물드니 헤더 띠만 칠하고,
 * 검색 결과 제목은 반대로 제목 하나만 칠하면 줄 중간에 뜬금없는 색
 * 조각이 생기니 감싸는 줄을 칠한다. 그래서 조상 → 자손 → 자기 자신
 * 순서로 `data-arrival-host`를 찾는다.
 */
function resolveHost(target: Element): Element {
  return (
    target.closest('[data-arrival-host]') ??
    target.querySelector('[data-arrival-host]') ??
    target
  );
}

export function markArrival(target: Element | null | undefined): void {
  if (!target || typeof window === 'undefined') {
    return;
  }

  const host = resolveHost(target);

  clearMark();

  // 같은 대상으로 두 번 연속 점프해도 다시 재생되게 리플로를 강제한다.
  // 속성만 다시 붙이면 브라우저는 애니메이션을 이어서 끝난 상태로 둔다.
  void (host as HTMLElement).offsetWidth;

  host.setAttribute(ATTRIBUTE, '');
  markedElement = host;

  clearTimer = window.setTimeout(() => {
    clearTimer = null;
    markedElement?.removeAttribute(ATTRIBUTE);
    markedElement = null;
  }, ARRIVAL_MARK_MS);
}
