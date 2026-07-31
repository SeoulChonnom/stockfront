import { Button } from '@/components/ui/button';

/**
 * README §7-6 point 1: h1 `배치 운영` (`id="page-title"`, focusable for
 * route-change focus per §7-1) + description + right-aligned `수동 실행`
 * primary button (`id="trigger-btn"` — the Trigger dialog returns focus
 * here on close via `Dialog`'s shared `useDismissable`, which remembers
 * whatever had focus when it opened).
 */
export function BatchHeader({ onOpenTrigger }: { onOpenTrigger: () => void }) {
  return (
    // E2 (parity cycle 2): design pins 수동 실행 to the BOTTOM of the header
    // block (`align-items:flex-end`), not the top.
    // M1 (parity cycle 4): the design (`display:flex;flex-wrap:wrap;
    // align-items:flex-end;gap:12px`) never stacks this header into a
    // column at any width — at narrow viewports the text block (`flex:1`)
    // just wraps internally onto more lines while the button stays on the
    // same flex line, pinned bottom-right of it. The previous
    // `flex-col sm:flex-row` stacked the button below the text below `sm:`,
    // which is what produced the mismatch. A single row at every
    // breakpoint removes the need for that stacking switch entirely.
    <header className='flex flex-wrap items-end gap-3'>
      <div className='min-w-0 flex-1'>
        <h1
          className='m-0 mb-1 text-[22px] font-semibold text-[color:var(--text)]'
          id='page-title'
          tabIndex={-1}
        >
          배치 운영
        </h1>
        {/* E1: exact design copy. */}
        <p className='wrap-anywhere mt-1 max-w-[70ch] text-[13.5px] text-[color:var(--text-soft)]'>
          일간 통합 배치의 단계별 진행, 실패 지점, 영향 범위를 확인합니다.
          목록과 상세는 독립적으로 조회되며 한쪽이 실패해도 다른 쪽 문맥은
          유지됩니다.
        </p>
      </div>
      {/* C1 / O1 (parity cycle 3): this button no longer needs `self-start`
          to avoid stretching full-width — that was only a risk while the
          header was `flex-col` (a column's cross axis is horizontal, so
          `align-items:stretch` there stretches children full-width). Now
          that the header is a permanent flex ROW (see the header comment
          above), the cross axis is vertical and this header's
          `items-end` never stretches on the main axis regardless. Re-check
          at 390: the button stays content-width. */}
      <Button
        id='trigger-btn'
        onClick={onOpenTrigger}
        type='button'
        variant='primary'
      >
        수동 실행
      </Button>
    </header>
  );
}
