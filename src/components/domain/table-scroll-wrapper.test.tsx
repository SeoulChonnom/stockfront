import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TableScrollWrapper } from '@/components/domain/table-scroll-wrapper';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

/**
 * jsdom은 레이아웃을 계산하지 않아 `scrollWidth`/`clientWidth`가 항상 0이다.
 * `[data-slot="table-container"]`는 `ui/table`이 렌더하는 고정 마크업이라
 * `Object.defineProperty`로 직접 스텁해야 스크롤 가능/불가 분기를 재현할 수
 * 있다.
 */
function stubScrollMetrics(
  element: Element,
  { scrollWidth, clientWidth }: { scrollWidth: number; clientWidth: number }
) {
  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    value: scrollWidth,
  });
  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    value: clientWidth,
  });
}

function renderWrapper() {
  render(
    <TableScrollWrapper label='표'>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>셀</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableScrollWrapper>
  );

  const viewport = document.querySelector('[data-slot="table-container"]');
  if (!viewport) {
    throw new Error('table-container not rendered');
  }
  return viewport;
}

describe('TableScrollWrapper', () => {
  // 핵심 회귀: 이 컴포넌트는 더 이상 자체 overflow-x-auto 뷰포트를 갖지
  // 않는다. 레지스트리 `[data-slot="table-container"]`가 유일한 스크롤
  // 뷰포트여야 한다 — 이중으로 감싸면 바깥 div가 항상
  // scrollWidth === clientWidth로 측정되어 접근성 속성이 영영 붙지 않는다.
  it('스크롤 뷰포트가 [data-slot="table-container"] 단 하나뿐이다', () => {
    renderWrapper();

    const viewports = document.querySelectorAll(
      '[data-slot="table-container"]'
    );
    expect(viewports).toHaveLength(1);
    expect(screen.getByRole('table').parentElement).toBe(viewports[0]);
  });

  it('스크롤 가능하면 컨테이너에 role/tabIndex/aria-label을 붙인다', () => {
    const viewport = renderWrapper();
    stubScrollMetrics(viewport, { scrollWidth: 800, clientWidth: 400 });

    // ResizeObserver는 jsdom 스텁이라 콜백을 스스로 부르지 않으므로,
    // 스크롤 이벤트로 measure()를 다시 트리거한다.
    fireEvent.scroll(viewport);

    expect(viewport).toHaveAttribute('role', 'region');
    expect(viewport).toHaveAttribute('tabindex', '0');
    expect(viewport).toHaveAttribute('aria-label', '표');
  });

  it('스크롤 불가하면 role/tabIndex/aria-label을 붙이지 않는다', () => {
    const viewport = renderWrapper();
    stubScrollMetrics(viewport, { scrollWidth: 400, clientWidth: 400 });

    fireEvent.scroll(viewport);

    expect(viewport).not.toHaveAttribute('role');
    expect(viewport).not.toHaveAttribute('tabindex');
    expect(viewport).not.toHaveAttribute('aria-label');
  });
});
