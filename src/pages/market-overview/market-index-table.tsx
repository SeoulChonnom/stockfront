import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScrollWrapper,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { MarketIndex } from '@/lib/view-models';

/**
 * 대표 지수 — README §7-2: "카드 대신 밀도 높은 표". ≤640px에서 고가/저가
 * 컬럼을 접되 값을 버리지 않고 종가 셀 아래 서브라인으로 노출한다.
 *
 * `TableCollapsibleCell`/`TablePriorityCell`(`@/components/ui/table`)은
 * md/lg/xl 붕괴점만 지원해 640px(Tailwind `sm`)엔 쓸 수 없으므로, 이 표만
 * `sm:table-cell`/`sm:hidden`을 직접 쓴다 — 같은 "숨김 대신 서브라인" 계약은
 * 그대로 지킨다.
 *
 * D7: 지수명 옆 mono 코드 서브라인(§7-2 "이름 + mono 코드 서브라인")은
 * `MarketIndex.code`가 `mapIndex`(`mappers.ts:178`)에서 이미 매핑되어 view
 * model까지 도달한다 — 이 표가 그동안 렌더하지 않고 있었을 뿐이다.
 */
export function MarketIndexTable({ indices }: { indices: MarketIndex[] }) {
  if (indices.length === 0) {
    return (
      <p className='m-0 px-4 py-4 text-[13px] text-[color:var(--text-faint)]'>
        지수 데이터가 수집되지 않았습니다. provider 응답 실패 시 부분 실패로
        처리되며, 재수집은 배치 운영에서 같은 기준일로 실행합니다.
      </p>
    );
  }

  return (
    <TableScrollWrapper>
      <Table className='text-[13px]' minWidth={380}>
        <TableHeader>
          <TableRow>
            <TableHead className='h-auto px-4 py-2 text-[11px]'>지수</TableHead>
            <TableHead className='h-auto px-3 py-2 text-right text-[11px]'>
              종가
            </TableHead>
            {/* C1: `w-[1%]` shrinks 등락/등락률 to their own content width
                instead of claiming a disproportionate share of the table's
                auto-layout surplus space at 고가/저가's expense — same total
                table width, closer to the design's even column distribution. */}
            <TableHead className='h-auto w-[1%] px-3 py-2 text-right text-[11px] whitespace-nowrap'>
              등락
            </TableHead>
            <TableHead className='h-auto w-[1%] px-3 py-2 text-right text-[11px] whitespace-nowrap'>
              등락률
            </TableHead>
            <TableHead className='hidden h-auto px-3 py-2 text-right text-[11px] whitespace-nowrap sm:table-cell'>
              고가
            </TableHead>
            <TableHead className='hidden h-auto px-4 py-2 text-right text-[11px] whitespace-nowrap sm:table-cell'>
              저가
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* `MarketIndex.code` is nullable and `label` is not guaranteed
              unique, so the index is what keeps keys distinct. Rows are
              stateless and the list is replaced on each snapshot fetch. */}
          {indices.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stateless rows, no stable id available — see above
            <IndexRow item={item} key={`${item.label}-${index}`} />
          ))}
        </TableBody>
      </Table>
    </TableScrollWrapper>
  );
}

function IndexRow({ item }: { item: MarketIndex }) {
  const directionClass =
    item.direction === 'up'
      ? 'text-[color:var(--up)]'
      : 'text-[color:var(--down)]';

  return (
    <TableRow>
      <TableCell className='min-w-0 px-4 py-[9px] font-semibold'>
        {item.label}
        {item.code ? (
          <div className='mono mt-0.5 text-[11px] font-normal text-[color:var(--text-faint)]'>
            {item.code}
          </div>
        ) : null}
      </TableCell>
      <TableCell className='mono px-3 py-[9px] text-right font-semibold'>
        {item.value}
        <div className='mt-1 text-[10.5px] font-normal text-[color:var(--text-faint)] sm:hidden'>
          {`고 ${item.high} · 저 ${item.low}`}
        </div>
      </TableCell>
      <TableCell
        className={cn(
          'mono px-3 py-[9px] text-right font-semibold',
          directionClass
        )}
      >
        {item.change}
      </TableCell>
      <TableCell
        className={cn(
          'mono px-3 py-[9px] text-right font-semibold',
          directionClass
        )}
      >
        {item.changeRate}
      </TableCell>
      <TableCell className='mono hidden px-3 py-[9px] text-right text-[color:var(--text-soft)] sm:table-cell'>
        {item.high}
      </TableCell>
      <TableCell className='mono hidden px-4 py-[9px] text-right text-[color:var(--text-soft)] sm:table-cell'>
        {item.low}
      </TableCell>
    </TableRow>
  );
}
