/** Programmatic focus may not show `:focus-visible`, so mark one arrival target. */

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

/** Prefer an explicit host around or within the scroll target. */
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
