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
 * 지수명 옆 mono 코드 서브라인(§7-2 "이름 + mono 코드 서브라인")은 DTO의
 * `indexCode`가 `mapIndex`(`mappers.ts`)에서 view model에 남지 않아 생략했다
 * — 리포트의 데이터 계층 의존성 참고.
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
            <TableHead className='h-auto px-3 py-2 text-right text-[11px]'>
              등락
            </TableHead>
            <TableHead className='h-auto px-3 py-2 text-right text-[11px]'>
              등락률
            </TableHead>
            <TableHead className='hidden h-auto px-3 py-2 text-right text-[11px] sm:table-cell'>
              고가
            </TableHead>
            <TableHead className='hidden h-auto px-4 py-2 text-right text-[11px] sm:table-cell'>
              저가
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {indices.map((item, index) => (
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
      <TableCell className='min-w-0 px-4 py-2.5 font-semibold'>
        {item.label}
      </TableCell>
      <TableCell className='mono px-3 py-2.5 text-right font-semibold'>
        {item.value}
        <div className='mt-1 text-[10.5px] font-normal text-[color:var(--text-faint)] sm:hidden'>
          {`고 ${item.high} · 저 ${item.low}`}
        </div>
      </TableCell>
      <TableCell
        className={cn(
          'mono px-3 py-2.5 text-right font-semibold',
          directionClass
        )}
      >
        {item.change}
      </TableCell>
      <TableCell
        className={cn(
          'mono px-3 py-2.5 text-right font-semibold',
          directionClass
        )}
      >
        {item.changeRate}
      </TableCell>
      <TableCell className='mono hidden px-3 py-2.5 text-right text-[color:var(--text-soft)] sm:table-cell'>
        {item.high}
      </TableCell>
      <TableCell className='mono hidden px-4 py-2.5 text-right text-[color:var(--text-soft)] sm:table-cell'>
        {item.low}
      </TableCell>
    </TableRow>
  );
}
