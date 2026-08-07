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
 * The nullable `MarketIndex.code` is already mapped into the view model; this
 * table renders it as the mono subline beside each index name.
 */
export function MarketIndexTable({ indices }: { indices: MarketIndex[] }) {
  if (indices.length === 0) {
    return (
      <p className='m-0 px-[18px] py-4 text-[13px] text-faint'>
        지수 데이터가 수집되지 않았습니다. provider 응답 실패 시 부분 실패로
        처리되며, 재수집은 배치 운영에서 같은 기준일로 실행합니다.
      </p>
    );
  }

  return (
    <TableScrollWrapper>
      <Table className='border-collapse text-[13px]' minWidth={380}>
        <TableHeader>
          <TableRow>
            <TableHead className='h-auto px-[18px] py-2 text-[11px]'>
              지수
            </TableHead>
            <TableHead className='h-auto px-3 py-2 text-right text-[11px]'>
              종가
            </TableHead>
            <TableHead className='h-auto px-3 py-2 text-right text-[11px] whitespace-nowrap'>
              등락
            </TableHead>
            <TableHead className='h-auto px-3 py-2 text-right text-[11px] whitespace-nowrap'>
              등락률
            </TableHead>
            <TableHead className='hidden h-auto px-3 py-2 text-right text-[11px] whitespace-nowrap sm:table-cell'>
              고가
            </TableHead>
            <TableHead className='hidden h-auto px-[18px] py-2 text-right text-[11px] whitespace-nowrap sm:table-cell'>
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
      : item.direction === 'down'
        ? 'text-[color:var(--down)]'
        : 'text-faint';

  return (
    <TableRow>
      <TableCell className='min-w-0 px-[18px] py-[9px] font-semibold'>
        {item.label}
        {item.code ? (
          <div className='mono text-[11px] font-normal text-faint'>
            {item.code}
          </div>
        ) : null}
      </TableCell>
      <TableCell className='mono px-3 py-[9px] text-right font-semibold'>
        {item.value}
        <div className='text-[10.5px] font-normal whitespace-nowrap text-faint sm:hidden'>
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
      <TableCell className='mono hidden px-3 py-[9px] text-right text-fg-soft sm:table-cell'>
        {item.high}
      </TableCell>
      <TableCell className='mono hidden px-[18px] py-[9px] text-right text-fg-soft sm:table-cell'>
        {item.low}
      </TableCell>
    </TableRow>
  );
}
