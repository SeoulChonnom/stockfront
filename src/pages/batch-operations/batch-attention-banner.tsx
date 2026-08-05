import { Button } from '@/components/ui/button';

/**
 * README §7-6 point 3: shown only when `failedCount + partialCount > 0`.
 * The two quick-filter buttons set the status query and reset to `page=1`
 * (§7-6: "status 쿼리 설정, page=1") rather than opening a separate filter
 * form.
 */
export function BatchAttentionBanner({
  failedCount,
  partialCount,
  onFilterFailed,
  onFilterPartial,
}: {
  failedCount: number;
  partialCount: number;
  onFilterFailed: () => void;
  onFilterPartial: () => void;
}) {
  return (
    // C3: design is a `--surface` white card with a real 4px `--danger`
    // left border, not a soft-red fill with a full border.
    // M2 (parity cycle 4): design's message `<span>` carries no
    // `flex-grow` and the button group has `margin-left:auto` — at 390 the
    // message's own hypothetical width already fills the row on its own,
    // so the button group (which doesn't fit alongside it) wraps whole
    // onto the next line. The app's `flex-1` on the message forced it to
    // share the row with the buttons at all widths, squeezing it into 3
    // lines instead of 1.
    <div className='flex min-w-0 flex-wrap items-center gap-2.5 rounded-[var(--r-lg)] border border-[color:var(--danger-line)] border-l-4 border-l-[color:var(--danger)] bg-[color:var(--surface)] px-4 py-3'>
      <p className='wrap-anywhere m-0 text-[13.5px] font-semibold text-[color:var(--text)]'>
        {failedCount}건 실패, {partialCount}건 부분 실패 — 확인이 필요합니다.
      </p>
      {/* 이 배너의 두 버튼은 참조(782-783행)에서 `min-height:36px`이다 —
          `size='sm'`의 기본 40px보다 4px 낮다. 그 4px이 배너 전체 높이 차
          (66 vs 62)이자, 이 배너 아래 모든 블록이 2.406px씩 밀리던 누적
          y-오프셋의 주 원인이었다(요약 타일 자체는 108.4px로 이미 일치).
          폰트(12.5px)·행간(20px)은 이미 맞으므로 높이만 맞춘다. */}
      <div className='ml-auto flex flex-wrap gap-2'>
        <Button
          className='min-h-9'
          onClick={onFilterFailed}
          size='sm'
          type='button'
          variant='ghost'
        >
          실패만 보기
        </Button>
        <Button
          className='min-h-9'
          onClick={onFilterPartial}
          size='sm'
          type='button'
          variant='ghost'
        >
          부분 실패만 보기
        </Button>
      </div>
    </div>
  );
}
