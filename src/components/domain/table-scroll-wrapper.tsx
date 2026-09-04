import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

type ScrollEdges = { scrollable: boolean; start: boolean; end: boolean };

const IDLE_EDGES: ScrollEdges = { scrollable: false, start: false, end: false };

/**
 * 레지스트리 `Table`이 렌더하는 `[data-slot="table-container"]`가 실제
 * 가로 스크롤 뷰포트다. children이 아직 테이블을 렌더하지 않았거나(로딩
 * 스켈레톤으로 교체된 경우 등) `ui/table`의 `Table`을 쓰지 않으면 없을 수
 * 있다 — 그 경우 측정/장식할 대상이 없으므로 호출부가 null을 받아 조용히
 * 넘어가게 한다.
 */
function findScrollViewport(root: HTMLElement | null) {
  return (
    root?.querySelector<HTMLElement>('[data-slot="table-container"]') ?? null
  );
}

/**
 * 뷰포트를 자체 소유하던 이전 구현의 측정 로직을 그대로 옮긴 것 — 컨테이너가
 * 레지스트리 소유로 바뀌었을 뿐 스크롤 가능 판정 기준(1px 여유)은 동일하다.
 */
function useScrollEdges(rootRef: RefObject<HTMLDivElement | null>) {
  const [edges, setEdges] = useState<ScrollEdges>(IDLE_EDGES);

  useEffect(() => {
    const viewport = findScrollViewport(rootRef.current);

    if (!viewport) {
      return;
    }

    function measure() {
      // TS는 위 조기 반환의 좁힘을 ResizeObserver/이벤트 콜백처럼 나중에
      // 호출되는 클로저까지 이어주지 않으므로 여기서 다시 확인한다.
      if (!viewport) {
        return;
      }

      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      const scrollable = maxScroll > 1;

      setEdges({
        scrollable,
        start: scrollable && viewport.scrollLeft > 1,
        end: scrollable && viewport.scrollLeft < maxScroll - 1,
      });
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);

    const table = viewport.firstElementChild;

    if (table) {
      observer.observe(table);
    }

    viewport.addEventListener('scroll', measure, { passive: true });

    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', measure);
    };
  }, [rootRef]);

  return edges;
}

/**
 * 레지스트리 `[data-slot="table-container"]`는 props를 받지 않는다
 * (className도 ...props도 전달되지 않는 고정 마크업) — 그래서
 * role/tabIndex/aria-label을 JSX로 얹을 수 없고, 스크롤 가능 여부가 바뀔
 * 때 DOM에 직접 붙이고 뗀다.
 */
function useScrollRegionAttrs(
  rootRef: RefObject<HTMLDivElement | null>,
  isScrollable: boolean,
  label: string | undefined
) {
  useEffect(() => {
    const viewport = findScrollViewport(rootRef.current);

    if (!viewport) {
      return;
    }

    if (isScrollable) {
      viewport.setAttribute('role', 'region');
      viewport.tabIndex = 0;
      if (label) {
        viewport.setAttribute('aria-label', label);
      }
    } else {
      viewport.removeAttribute('role');
      viewport.removeAttribute('tabindex');
      viewport.removeAttribute('aria-label');
    }
  }, [rootRef, isScrollable, label]);
}

export function TableScrollWrapper({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const edges = useScrollEdges(rootRef);
  useScrollRegionAttrs(rootRef, edges.scrollable, label);

  return (
    <div className={cn('relative min-w-0', className)} ref={rootRef}>
      {children}
      <div
        aria-hidden='true'
        className={cn(
          'pointer-events-none absolute inset-y-0 start-0 w-7 bg-[linear-gradient(to_right,var(--scroll-edge),transparent)] transition-opacity duration-(--dur-fast)',
          edges.start ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden='true'
        className={cn(
          'pointer-events-none absolute inset-y-0 end-0 w-7 bg-[linear-gradient(to_left,var(--scroll-edge),transparent)] transition-opacity duration-(--dur-fast)',
          edges.end ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}
